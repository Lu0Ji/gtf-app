import { describe, expect, it } from 'vitest'
import { checkPredictionText } from './predictionCheck.js'

describe('checkPredictionText', () => {
  it('accepts a genuine future-tense claim', () => {
    expect(checkPredictionText('Fenerbahçe, Galatasaray\'ı 3-2 yenecek.').valid).toBe(true)
  })

  it('accepts claims using the -acak suffix', () => {
    expect(checkPredictionText('Bitcoin yıl sonuna kadar 150 bin doları geçecek.').valid).toBe(true)
    expect(checkPredictionText('iPhone 18 fiyatı 80 bin TL\'yi geçecek.').valid).toBe(true)
  })

  it('accepts the y-buffered form after a vowel-final stem', () => {
    expect(checkPredictionText('Play-off turunda elenip finale gidemeyecek.').valid).toBe(true)
  })

  it('rejects text with no future-tense claim', () => {
    const result = checkPredictionText('Bence kediler çok tatlıdır ve harika hayvanlardır.')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/gelecek zaman/)
  })

  it('rejects a question', () => {
    const result = checkPredictionText('Galatasaray bu sezon şampiyon olacak mı?')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/soru/)
  })

  it('rejects text that is too short', () => {
    const result = checkPredictionText('Olacak.')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/kısa/)
  })

  it('rejects empty/whitespace input', () => {
    expect(checkPredictionText('').valid).toBe(false)
    expect(checkPredictionText('   ').valid).toBe(false)
  })

  it('rejects mostly-non-letter spam', () => {
    const result = checkPredictionText('!!!! 12345 ##### $$$$ @@@@ ///// _____')
    expect(result.valid).toBe(false)
  })
})
