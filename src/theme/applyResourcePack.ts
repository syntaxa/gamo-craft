import type { ResourcePackSpec } from './resourcePacks';

function setCssVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

function asBgTexture(url: string): string {
  return url ? `url("${url}")` : 'none';
}

export function applyResourcePack(pack: ResourcePackSpec) {
  setCssVar('--font-ui', pack.ui.fontFamily);
  setCssVar('--line', pack.ui.palette.line);
  setCssVar('--text-main', pack.ui.palette.text);
  setCssVar('--nav-bg', pack.ui.palette.navBg);
  setCssVar('--nav-active', pack.ui.palette.navActive);
  setCssVar('--nav-active-line', pack.ui.palette.navActiveLine);
  setCssVar('--tex-app-bg', asBgTexture(pack.ui.textures.appBg));
  setCssVar('--tex-card', asBgTexture(pack.ui.textures.card));
  setCssVar('--tex-button', asBgTexture(pack.ui.textures.button));
  setCssVar('--tex-hud-panel', asBgTexture(pack.ui.textures.hudPanel));
  setCssVar('--tex-hotbar-slot', asBgTexture(pack.ui.textures.hotbarSlot));
  setCssVar('--tex-hotbar-slot-selected', asBgTexture(pack.ui.textures.hotbarSlotSelected));
  setCssVar('--tex-coin', asBgTexture(pack.ui.textures.coinIcon));
  document.documentElement.setAttribute('data-resource-pack', pack.id);
}

