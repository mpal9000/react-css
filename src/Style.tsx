import { ReactElement } from 'react'
import { GlobalStyleOptions, LocalStyleOptions, useStyle } from './useStyle.js'

type ChildrenProp = ReactElement | null

export type GlobalStyleProps = GlobalStyleOptions & {
  readonly children: ChildrenProp
}

export type LocalStyleProps<
  Selector extends string
> = LocalStyleOptions<Selector> & {
  readonly children: ChildrenProp
}

export type StyleProps<Selector extends string> =
  | GlobalStyleProps
  | LocalStyleProps<Selector>

export const Style = <Selector extends string>(
  props: StyleProps<Selector>,
): StyleProps<Selector>['children'] => {
  const { children, ...restProps } = props

  useStyle(restProps)

  return props.children
}
