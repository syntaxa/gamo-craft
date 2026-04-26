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
};

export type WorldPackSpec = {
  skyTextureUrl: string;
  groundTextureUrl: string;
  defaultBlock: BlockMaterialSpec;
  blocks: Record<string, BlockMaterialSpec>;
};

export type UiPackSpec = {
  fontFamily: string;
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

const cartoonBlockyV1: ResourcePackSpec = {
  id: 'cartoon-blocky-v1',
  displayName: 'Cartoon Blocky v1',
  styleTag: 'multicolor-voxel',
  license: 'CC0',
  sources: ['https://www.kenney.nl/assets/voxel-pack', 'https://www.kenney.nl/assets/ui-pack'],
  world: {
    skyTextureUrl: '/resource-packs/cartoon-blocky-v1/world/sky_fading_night.png',
    groundTextureUrl: '/resource-packs/cartoon-blocky-v1/world/ground_grass.jpg',
    defaultBlock: {
      textureUrl: '/resource-packs/cartoon-blocky-v1/world/block_brick_red.png',
      color: '#f7f7f7',
      roughness: 0.9,
      metalness: 0.03,
    },
    blocks: {
      block_grass_dirt: {
        textureUrl: '/resource-packs/cartoon-blocky-v1/world/block_grass_dirt.png',
        faceTextures: {
          side: '/resource-packs/cartoon-blocky-v1/world/block_grass_dirt.png',
          top: '/resource-packs/cartoon-blocky-v1/world/block_grass_top.png',
          bottom: '/resource-packs/cartoon-blocky-v1/world/block_dirt_bottom.png',
        },
        color: '#f7f7f7',
      },
      block_brick_red: {
        textureUrl: '/resource-packs/cartoon-blocky-v1/world/block_brick_red.png',
        color: '#f7f7f7',
      },
      res_planks: {
        textureUrl: '/resource-packs/cartoon-blocky-v1/world/block_wood.png',
        faceTextureRotationDeg: {
          side: 90,
        },
        color: '#f7f7f7',
      },
      block_glow_blue: {
        textureUrl: '/resource-packs/cartoon-blocky-v1/world/block_glow_blue.png',
        color: '#e4f1ff',
        emissive: '#3f88d4',
        roughness: 0.6,
        metalness: 0.08,
      },
      block_rainbow: {
        textureUrl: '/resource-packs/cartoon-blocky-v1/world/block_rainbow.png',
        color: '#ffffff',
        roughness: 0.75,
        metalness: 0.03,
      },
      block_cat_gold: {
        textureUrl: '/resource-packs/cartoon-blocky-v1/world/block_cat_gold.png',
        color: '#fff3c2',
        emissive: '#8a5a18',
        roughness: 0.5,
        metalness: 0.2,
      },
      block_coin: {
        textureUrl: '/resource-packs/cartoon-blocky-v1/world/block_coin.png',
        color: '#fff1bf',
        emissive: '#7a4f16',
        roughness: 0.52,
        metalness: 0.18,
      },
    },
  },
  ui: {
    fontFamily: "Verdana, 'Segoe UI', Tahoma, sans-serif",
    textures: {
      appBg: '/resource-packs/cartoon-blocky-v1/world/sky_clouds.png',
      card: '',
      button: '/resource-packs/cartoon-blocky-v1/ui/button_primary.png',
      hudPanel: '/resource-packs/cartoon-blocky-v1/ui/hud_panel.png',
      hotbarSlot: '/resource-packs/cartoon-blocky-v1/ui/hotbar_slot.png',
      hotbarSlotSelected: '/resource-packs/cartoon-blocky-v1/ui/hotbar_slot_selected.png',
      coinIcon: '/resource-packs/cartoon-blocky-v1/ui/coin_icon_kotocoin.svg',
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


