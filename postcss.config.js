module.exports = {
  plugins: {
    stylelint             : {},
    'postcss-easy-import' : {
      extensions : '.pcss',
      plugins    : [require('stylelint')()]
    },
    'postcss-nested'          : {},
    'postcss-cssnext'         : {},
    'postcss-responsive-type' : {},
    'postcss-preset-env'      : {
      browsers     : '> 0.25%, not dead',
      stage        : 0,
      autoprefixer : {
        grid: true
      }
    },
    cssnano: {
      preset: 'advanced'
    },
    'postcss-reporter': {
      clearReportedMessages: true
    }
  }
};
