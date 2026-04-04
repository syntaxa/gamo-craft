import { useEffect, type ReactNode } from 'react';
import { useAppStore } from '../store';
import { getPlayer, upsertPlayer } from '../../persistence/repositories/playerRepo';
import { getInventory, upsertInventory } from '../../persistence/repositories/inventoryRepo';
import { getLatestWorld, upsertWorld } from '../../persistence/repositories/worldRepo';

const PLAYER_ID = 'player-1';
const SAVE_DEBOUNCE_MS = 250;
const WORLD_MIN_SIZE_Y = 24;

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    const persistSnapshot = async () => {
      const state = useAppStore.getState();
      await Promise.all([
        upsertPlayer(state.player),
        upsertInventory(state.inventory),
        upsertWorld(state.world),
      ]);
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
        const [player, inventory, world] = await Promise.all([
          getPlayer(PLAYER_ID),
          getInventory(PLAYER_ID),
          getLatestWorld(PLAYER_ID),
        ]);

        if (cancelled) return;

        if (player || inventory || world) {
          const normalizedWorld =
            world && world.sizeY < WORLD_MIN_SIZE_Y
              ? { ...world, sizeY: WORLD_MIN_SIZE_Y, updatedAt: new Date().toISOString() }
              : world;

          useAppStore.setState((state) => ({
            player: player ?? state.player,
            inventory: inventory ?? state.inventory,
            world: normalizedWorld ?? state.world,
          }));
        }

        await persistSnapshot();

        if (cancelled) return;

        unsubscribe = useAppStore.subscribe((state, prevState) => {
          if (
            state.player === prevState.player &&
            state.inventory === prevState.inventory &&
            state.world === prevState.world
          ) {
            return;
          }

          schedulePersist();
        });
      } catch (error) {
        console.error('Failed to hydrate app state', error);
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return <>{children}</>;
}
