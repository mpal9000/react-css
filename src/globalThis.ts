const GLOBAL =
  // eslint-disable-next-line no-restricted-globals
  typeof globalThis === 'object' && globalThis === window ? globalThis : window

export { GLOBAL as globalThis }
