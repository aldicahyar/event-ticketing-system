module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [...(options.externals || []), {
      'bcrypt': 'commonjs bcrypt'
    }],
  };
};
