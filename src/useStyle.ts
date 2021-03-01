import { useRef, useLayoutEffect } from 'react'
import {
  StyleSheetId,
  GlobalStyleSheet,
  LocalStyleSheet,
  InjectGlobalStyleSheetOptions,
  InjectLocalStyleSheetOptions,
  RemoveGlobalStyleSheetOptions,
  RemoveLocalStyleSheetOptions,
  isGlobalStyleSheet,
  injectGlobalStyleSheet,
  injectLocalStyleSheet,
  removeGlobalStyleSheet,
  removeLocalStyleSheet,
} from '@mpal9000/ts-css'
import { UnknownRecord } from './types.js'
import { cacheValue } from './cache.js'

export type GlobalStyleOptions = {
  readonly sheet: GlobalStyleSheet
  readonly injectOptions?: InjectGlobalStyleSheetOptions
  readonly removeOptions?: RemoveGlobalStyleSheetOptions
}

export type LocalStyleOptions<Selector extends string> = {
  readonly sheet: LocalStyleSheet<Selector>
  readonly injectOptions?: InjectLocalStyleSheetOptions
  readonly removeOptions?: RemoveLocalStyleSheetOptions
}

export type StyleOptions<Selector extends string> =
  | GlobalStyleOptions
  | LocalStyleOptions<Selector>

const GLOBAL_CACHE_KEY = Symbol('GLOBAL_CACHE_KEY')

const REFERENCE_COUNT_MAP = cacheValue(
  GLOBAL_CACHE_KEY,
  new Map<StyleSheetId, number>(),
)

const recordKeys = <Rec extends UnknownRecord, Key extends keyof Rec>(
  record: Rec,
): readonly Key[] => {
  // type-coverage:ignore-next-line
  return Object.keys(record) as Key[]
}

const shallowEquals = <Rec1 extends UnknownRecord, Rec2 extends Rec1>(
  record1: Rec1,
  record2: Rec2,
): boolean => {
  if (Object.is(record1, record2)) return true

  const record1Keys = recordKeys(record1)
  const record2Keys = recordKeys(record2)

  if (record1Keys.length !== record2Keys.length) return false

  return record1Keys.every((record1Key) =>
    Object.is(record1[record1Key], record2[record1Key]),
  )
}

const getReferenceCount = (styleSheetId: StyleSheetId): number => {
  const currentCount = REFERENCE_COUNT_MAP.get(styleSheetId)

  return currentCount ?? 0
}

const addReference = (styleSheetId: StyleSheetId): number => {
  const currentCount = REFERENCE_COUNT_MAP.get(styleSheetId)
  const nextCount = currentCount !== undefined ? currentCount + 1 : 1

  REFERENCE_COUNT_MAP.set(styleSheetId, nextCount)

  return nextCount
}

const removeReference = (styleSheetId: StyleSheetId): number => {
  const currentCount = REFERENCE_COUNT_MAP.get(styleSheetId)
  const nextCount = currentCount !== undefined ? currentCount - 1 : 0

  if (nextCount > 0) {
    REFERENCE_COUNT_MAP.set(styleSheetId, nextCount)
  } else {
    REFERENCE_COUNT_MAP.delete(styleSheetId)
  }

  return nextCount
}

const hookDependencyFromShallowComparedRecord = (
  ref: React.MutableRefObject<UnknownRecord | undefined>,
  maybeRecord: UnknownRecord | undefined,
): UnknownRecord | undefined => {
  if (
    ref.current === undefined ||
    maybeRecord === undefined ||
    !shallowEquals(ref.current, maybeRecord)
  ) {
    ref.current = maybeRecord
  }

  return ref.current
}

const useHookDependenciesFromInjectOptions = (
  injectOptions: InjectGlobalStyleSheetOptions | InjectLocalStyleSheetOptions,
): readonly unknown[] => {
  const attributesOptionRef = useRef<UnknownRecord | undefined>()

  return recordKeys(injectOptions).reduce<readonly unknown[]>(
    (acc, optionKey) => {
      switch (optionKey) {
        case 'attributes': {
          return acc.concat([
            hookDependencyFromShallowComparedRecord(
              attributesOptionRef,
              injectOptions[optionKey],
            ),
          ])
        }
        case 'replace':
        case 'parentElement': {
          return acc.concat([injectOptions[optionKey]])
        }
      }
    },
    [],
  )
}

const useHookDependenciesFromRemoveOptions = (
  removeOptions: RemoveGlobalStyleSheetOptions | RemoveLocalStyleSheetOptions,
): readonly unknown[] => {
  return recordKeys(removeOptions).reduce<readonly unknown[]>(
    (acc, optionKey) => {
      switch (optionKey) {
        case 'parentElement': {
          return acc.concat([removeOptions[optionKey]])
        }
      }
    },
    [],
  )
}

export const useStyle = <Selector extends string>(
  options: StyleOptions<Selector>,
): void => {
  const { sheet, injectOptions = {}, removeOptions = {} } = options

  useLayoutEffect(() => {
    const { id } = sheet

    if (getReferenceCount(id) === 0) {
      if (isGlobalStyleSheet(sheet)) {
        injectGlobalStyleSheet(injectOptions, sheet)
      } else {
        injectLocalStyleSheet(injectOptions, sheet)
      }
    }

    addReference(id)

    return () => {
      if (removeReference(id) === 0) {
        if (isGlobalStyleSheet(sheet)) {
          removeGlobalStyleSheet(removeOptions, sheet)
        } else {
          removeLocalStyleSheet(removeOptions, sheet)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sheet,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...useHookDependenciesFromInjectOptions(injectOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...useHookDependenciesFromRemoveOptions(removeOptions),
  ])
}
