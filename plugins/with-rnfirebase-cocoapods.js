const { withPodfile } = require('@expo/config-plugins');

const FLAG = '$RNFirebaseDisableSPM = true';

module.exports = function withRNFirebaseCocoaPods(config) {
  return withPodfile(config, (next) => {
    if (!next.modResults.contents.includes(FLAG)) {
      next.modResults.contents = `${FLAG}\n${next.modResults.contents}`;
    }
    return next;
  });
};
