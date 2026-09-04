import { describe, expect, it } from 'vitest'
import { checkPredictionText } from './predictionCheck.js'

describe('checkPredictionText (Turkish, default lng)', () => {
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
    expect(result.reasonKey).toBe('createPrediction.checkNoFutureClaim')
  })

  it('rejects a question', () => {
    const result = checkPredictionText('Galatasaray bu sezon şampiyon olacak mı?')
    expect(result.valid).toBe(false)
    expect(result.reasonKey).toBe('createPrediction.checkIsQuestion')
  })

  it('rejects text that is too short', () => {
    const result = checkPredictionText('Olacak.')
    expect(result.valid).toBe(false)
    expect(result.reasonKey).toBe('createPrediction.checkTooShort')
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

// Same rule set, exercised per-language via the `lng` parameter — each
// language gets its own future-tense marker (see predictionCheck.js).
describe('checkPredictionText (other languages)', () => {
  it('accepts English "will" and "going to" claims', () => {
    expect(checkPredictionText('Fenerbahçe will beat Galatasaray 3-2.', 'en').valid).toBe(true)
    expect(checkPredictionText('Bitcoin is going to pass 150k by year end.', 'en').valid).toBe(true)
  })

  it('rejects English text with no future claim', () => {
    const result = checkPredictionText('I think cats are cute and wonderful animals.', 'en')
    expect(result.valid).toBe(false)
    expect(result.reasonKey).toBe('createPrediction.checkNoFutureClaim')
  })

  it('accepts German "wird/werden" claims', () => {
    expect(checkPredictionText('Fenerbahçe wird Galatasaray 3:2 besiegen.', 'de').valid).toBe(true)
  })

  it('accepts Spanish periphrastic and synthetic future claims', () => {
    expect(checkPredictionText('El Fenerbahçe va a ganar el derbi 3-2.', 'es').valid).toBe(true)
    expect(checkPredictionText('El Fenerbahçe ganará el derbi 3-2.', 'es').valid).toBe(true)
  })

  it('accepts Russian "будет"-style claims', () => {
    expect(checkPredictionText('Фенербахче будет играть очень хорошо в этом сезоне.', 'ru').valid).toBe(true)
  })

  it('accepts Chinese 将/会 claims', () => {
    expect(checkPredictionText('费内巴切将以3比2击败加拉塔萨雷。', 'zh').valid).toBe(true)
  })

  it('accepts Arabic سوف claims', () => {
    expect(checkPredictionText('فنربخشة سوف يفوز على غلطة سراي بنتيجة 3-2.', 'ar').valid).toBe(true)
  })

  it('accepts Arabic attached سـ-prefix claims (the more common everyday form)', () => {
    expect(checkPredictionText('سيفوز فنربخشة على غلطة سراي بنتيجة 3-2.', 'ar').valid).toBe(true)
  })

  it('never applies the future-tense check for Japanese (no reliable marker)', () => {
    // No "will"-equivalent exists to require — only length/question checks apply.
    const result = checkPredictionText('フェネルバフチェがガラタサライに3対2で勝つ試合になる予定です。', 'ja')
    expect(result.valid).toBe(true)
  })

  it('still rejects a too-short or question-form input regardless of language', () => {
    expect(checkPredictionText('Will win.', 'en').valid).toBe(false)
    expect(checkPredictionText('Will Fenerbahçe win?', 'en').reasonKey).toBe('createPrediction.checkIsQuestion')
  })
})
