module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [require("./scripts/babel-plugin-connexio-i18n.cjs")]
  };
};
