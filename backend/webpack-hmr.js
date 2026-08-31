module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [...(options.externals || []), {
      'bcrypt': 'commonjs bcrypt',
      // PDFKit loads its .afm font metrics from node_modules at runtime.
      // Keep it as a CJS external so those assets resolve from node_modules
      // instead of being bundled into dist where pdfkit/data/*.afm is missing.
      'pdfkit': 'commonjs pdfkit',
    }],
  };
};
