export type BlockMaterialSpec = {
  textureUrl: string;
  faceTextures?: {
    top?: string;
    bottom?: string;
    side?: string;
  };
  faceTextureRotationDeg?: {
    top?: number;
    bottom?: number;
    side?: number;
  };
  color: string;
  emissive?: string;
  metalness?: number;
  roughness?: number;
  transparent?: boolean;
  opacity?: number;
};

export type WorldPackSpec = {
  skyTextureUrl: string;
  groundTextureUrl: string;
  defaultBlock: BlockMaterialSpec;
  blocks: Record<string, BlockMaterialSpec>;
};

export type UiPackSpec = {
  fontFamily: string;
  fontUrl: string;
  textures: {
    appBg: string;
    card: string;
    button: string;
    hudPanel: string;
    hotbarSlot: string;
    hotbarSlotSelected: string;
    coinIcon: string;
  };
  palette: {
    line: string;
    text: string;
    navBg: string;
    navActive: string;
    navActiveLine: string;
  };
};

export type ResourcePackSpec = {
  id: string;
  displayName: string;
  styleTag: string;
  license: string;
  sources: string[];
  world: WorldPackSpec;
  ui: UiPackSpec;
};

// Абсолютные URL ассетов пакета с учётом base сборки (import.meta.env.BASE_URL):
// на локальном dev/preview это '/', на GitHub Pages — '/gamo-craft/'. Абсолютные пути
// нужны потому, что url() внутри CSS-переменных резолвится по месту использования
// (во внешнем bundled CSS в assets/), а не относительно документа.
const BASE_URL_WITH_SLASH = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

const PACK_ASSET_ROOT = `${BASE_URL_WITH_SLASH}resource-packs/cartoon-blocky-v1`;

function packAsset(path: string): string {
  return `${PACK_ASSET_ROOT}/${path}`;
}

const cartoonBlockyV1: ResourcePackSpec = {
  id: 'cartoon-blocky-v1',
  displayName: 'Cartoon Blocky v1',
  styleTag: 'multicolor-voxel',
  license: 'CC0',
  sources: ['https://www.kenney.nl/assets/voxel-pack', 'https://www.kenney.nl/assets/ui-pack'],
  world: {
    skyTextureUrl: packAsset('world/sky_fading_night.png'),
    groundTextureUrl: packAsset('world/ground_grass.jpg'),
    defaultBlock: {
      textureUrl: packAsset('world/block_brick_red.png'),
      color: '#f7f7f7',
      roughness: 0.9,
      metalness: 0.03,
    },
    blocks: {
      block_grass_dirt: {
        textureUrl: packAsset('world/block_grass_dirt.png'),
        faceTextures: {
          side: packAsset('world/block_grass_dirt.png'),
          top: packAsset('world/block_grass_top.png'),
          bottom: packAsset('world/block_dirt_bottom.png'),
        },
        color: '#f7f7f7',
      },
      block_brick_red: {
        textureUrl: packAsset('world/block_brick_red.png'),
        color: '#f7f7f7',
      },
      res_planks: {
        textureUrl: packAsset('world/block_wood.png'),
        faceTextureRotationDeg: {
          side: 90,
        },
        color: '#f7f7f7',
      },
      block_glow_blue: {
        textureUrl: packAsset('world/block_glow_blue.png'),
        color: '#e4f1ff',
        emissive: '#3f88d4',
        roughness: 0.6,
        metalness: 0.08,
      },
      block_rainbow: {
        textureUrl: packAsset('world/block_rainbow.png'),
        color: '#ffffff',
        roughness: 0.75,
        metalness: 0.03,
      },
      block_cat_gold: {
        textureUrl: packAsset('world/block_cat_gold.png'),
        color: '#fff3c2',
        emissive: '#8a5a18',
        roughness: 0.5,
        metalness: 0.2,
      },
      block_coin: {
        textureUrl: packAsset('world/block_coin.png'),
        color: '#fff1bf',
        emissive: '#7a4f16',
        roughness: 0.52,
        metalness: 0.18,
      },
      block_glass: {
        textureUrl: packAsset('world/block_glass.svg'),
        color: '#dff9ff',
        emissive: '#2c7f92',
        roughness: 0.18,
        metalness: 0.02,
        transparent: true,
        opacity: 0.42,
      },
    },
  },
  ui: {
    fontFamily: "Verdana, 'Segoe UI', Tahoma, sans-serif",
    fontUrl: packAsset('fonts/KenneyFuture.ttf'),
    textures: {
      appBg: packAsset('world/sky_clouds.png'),
      card: '',
      button: packAsset('ui/button_primary.png'),
      hudPanel: packAsset('ui/hud_panel.png'),
      hotbarSlot: packAsset('ui/hotbar_slot.png'),
      hotbarSlotSelected: packAsset('ui/hotbar_slot_selected.png'),
      coinIcon: packAsset('ui/coin_icon_kotocoin.svg'),
    },
    palette: {
      line: '#2e4a21',
      text: '#172412',
      navBg: '#b9e973',
      navActive: '#f4ff80',
      navActiveLine: '#4f7f2a',
    },
  },
};

const allResourcePacks: ResourcePackSpec[] = [cartoonBlockyV1];

export const resourcePackRegistry: Record<string, ResourcePackSpec> = Object.fromEntries(
  allResourcePacks.map((pack) => [pack.id, pack]),
);

export const defaultResourcePackId = cartoonBlockyV1.id;

export function resolveResourcePack(packId: string): ResourcePackSpec {
  return resourcePackRegistry[packId] ?? resourcePackRegistry[defaultResourcePackId];
}