import { he } from './he'
import { en } from './en'

export const translations = { he, en }

export function t(lang, key) {
  const keys = key.split('.')
  let val = translations[lang]
  for (const k of keys) {
    val = val?.[k]
  }
  return val || key
}
