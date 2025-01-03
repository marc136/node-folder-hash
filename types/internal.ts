import type { Options, RuleFn } from './public'

export type ParsedArgs = {
  basename: string
  dir: string
  options: InnerOptions
}

export type InnerOptions = Omit<Options, 'files' | 'folders'> & {
  files: MatchRules
  folders: MatchRules
  skipMatching?: boolean
  ignoreBasenameOnce?: boolean
}

export type MatchRules = {
  exclude: RuleFn | undefined
  include: RuleFn | undefined
  matchBasename: boolean
  matchPath: boolean
  ignoreBasename: boolean
  ignoreRootName: boolean
}
