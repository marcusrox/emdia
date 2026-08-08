const RELEASE_LABEL = "Release 08/08/2026 11:06 - 116";
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
