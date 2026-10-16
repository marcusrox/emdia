const RELEASE_LABEL = "Release 15/10/2026 21:45 - 121";
const ASSET_VERSION = RELEASE_LABEL.match(/-\s*(\d+)$/)?.[1] || "dev";

function versionedAssetPath(pathname) {
  const separator = String(pathname).includes("?") ? "&" : "?";
  return `${pathname}${separator}v=${encodeURIComponent(ASSET_VERSION)}`;
}

module.exports = {
  ASSET_VERSION,
  RELEASE_LABEL,
  versionedAssetPath,
};
