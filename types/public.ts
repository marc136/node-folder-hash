import type * as crypto from 'node:crypto'

export type Options = {
  algo: string
  algoOptions: crypto.HashOptions | undefined
  encoding: Encoding
  files: MatchOptions
  folders: MatchOptions
  symbolicLinks: SymbolicLinkOptions
}

export type Encoding = crypto.BinaryToTextEncoding

export type MatchOptions = {
  exclude: RuleOption
  include: RuleOption
  matchBasename: boolean
  matchPath: boolean
  ignoreBasename: boolean
  ignoreRootName: boolean
}

export type RuleOption = string[] | RuleFn
export type RuleFn = (s: string) => boolean

export type SymbolicLinkOptions = {
  include: boolean
  ignoreBasename?: boolean
  ignoreTargetPath: boolean
  ignoreTargetContent: boolean
  ignoreTargetContentAfterError: boolean
}

export type HashedElement = HashedFile | HashedFolder

export type HashedFile = {
  name: string,
  hash: string,
}

export type HashedFolder = {
  name: string
  hash: string
  children: HashedElement[]
}