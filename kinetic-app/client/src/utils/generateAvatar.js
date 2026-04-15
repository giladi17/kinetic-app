import { createAvatar } from '@dicebear/core'
import { micah, lorelei } from '@dicebear/collection'

export function generateTomAvatar() {
  return createAvatar(micah, {
    seed: 'TOM-kinetic',
    backgroundColor: ['1a1a1a'],
    baseColor: ['8B6914'],
    mouth: ['smile'],
    eyes: ['eyes01'],
    hair: ['short01'],
    hairColor: ['1a0f00'],
    earrings: ['none'],
  }).toString()
}

export function generateJaneAvatar() {
  return createAvatar(lorelei, {
    seed: 'JANE-kinetic',
    backgroundColor: ['1a1a1a'],
    hairColor: ['3d1f00'],
    skinColor: ['C68642'],
  }).toString()
}
