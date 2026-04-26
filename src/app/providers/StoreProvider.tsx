import { useEffect, type ReactNode } from 'react';
import { normalizeWorldState, useAppStore } from '../store';
import { getPlayer, upsertPlayer } from '../../persistence/repositories/playerRepo';
import { getInventory, upsertInventory } from '../../persistence/repositories/inventoryRepo';
import { getLatestWorld, upsertWorld } from '../../persistence/repositories/worldRepo';
import { readLocalAppSnapshot, writeLocalAppSnapshot } from '../../persistence/localSnapshot';

const PLAYER_ID = 'player-1';
const SAVE_DEBOUNCE_MS = 250;
const WORLD_MIN_SIZE_Y = 24;

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    let isHydrated = false;

    const persistSnapshot = async () => {
      if (!isHydrated) return;

      const state = useAppStore.getState();
      writeLocalAppSnapshot({
        player: state.player,
        inventory: state.inventory,
        world: state.world,
      });
      await Promise.all([
        upsertPlayer(state.player),
        upsertInventory(state.inventory),
        upsertWorld(state.world),
      ]);
    };

    const flushPersist = async () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
      await persistSnapshot();
    };

    const schedulePersist = () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        void persistSnapshot().catch((error) => {
          console.error('Failed to persist app state', error);
        });
      }, SAVE_DEBOUNCE_MS);
    };

    void (async () => {
      try {
        const localSnapshot = readLocalAppSnapshot();
        const [player, inventory, world] = await Promise.all([
          getPlayer(PLAYER_ID),
          getInventory(PLAYER_ID),
          getLatestWorld(PLAYER_ID),
        ]);

        if (cancelled) return;

        const shouldUseLocalSnapshot =
          Boolean(localSnapshot?.world) &&
          (!world || localSnapshot!.world.updatedAt.localeCompare(world.updatedAt) > 0);
        const latestWorld = shouldUseLocalSnapshot ? localSnapshot?.world : world;

        if (player || inventory || latestWorld || localSnapshot) {
          const normalizedWorld =
            latestWorld && latestWorld.sizeY < WORLD_MIN_SIZE_Y
              ? normalizeWorldState({
                  ...latestWorld,
                  sizeY: WORLD_MIN_SIZE_Y,
                  updatedAt: new Date().toISOString(),
                })
              : latestWorld
                ? normalizeWorldState(latestWorld)
                : latestWorld;

          useAppStore.setState((state) => ({
            player: shouldUseLocalSnapshot ? (localSnapshot?.player ?? state.player) : (player ?? state.player),
            inventory: shouldUseLocalSnapshot
              ? (localSnapshot?.inventory ?? state.inventory)
              : (inventory ?? state.inventory),
            world: normalizedWorld ?? state.world,
          }));
        }

        isHydrated = true;
        await flushPersist();

        if (cancelled) return;

        unsubscribe = useAppStore.subscribe((state, prevState) => {
          if (
            state.player === prevState.player &&
            state.inventory === prevState.inventory &&
            state.world === prevState.world
          ) {
            return;
          }

          if (state.world !== prevState.world) {
            writeLocalAppSnapshot({
              player: state.player,
              inventory: state.inventory,
              world: state.world,
            });
          }

          schedulePersist();
        });
      } catch (error) {
        console.error('Failed to hydrate app state', error);
      }
    })();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isHydrated) {
        void flushPersist().catch((error) => {
          console.error('Failed to flush app state on hide', error);
        });
      }
    };

    const onPageHide = () => {
      if (!isHydrated) return;

      void flushPersist().catch((error) => {
        console.error('Failed to flush app state on page hide', error);
      });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      if (isHydrated) {
        void flushPersist().catch((error) => {
          console.error('Failed to flush app state on unmount', error);
        });
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return <>{children}</>;
}
