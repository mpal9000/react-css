import { UnknownRecord, UnknownMap, UnknownArray } from './types.js'
import { globalThis } from './globalThis.js'

export const cacheValue = <
  Key extends symbol,
  Value extends UnknownRecord | UnknownMap | UnknownArray
>(
  key: Key,
  initialValue: Value,
): Value => {
  const globalContext: typeof globalThis &
    { readonly [K in Key]?: Value } = globalThis

  const value: Value = globalContext[key] ?? initialValue
  // type-coverage:ignore-next-line
  globalContext[key] = value as typeof globalContext[Key]

  return value
}
