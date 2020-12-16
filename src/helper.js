export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const parseNumber = (v) => {
  if (typeof v === 'string') {
    v = v.replace(/[,%$]+/g, '')
  }
  return parseFloat(v)
}
