import { describe, expect, it } from 'vitest'

import {
  CURRENCY_SYMBOLS,
  getCurrencyList,
} from '../../app/utils/currencies'

describe('utils/currencies', () => {
  describe('getCurrencyList', () => {
    it('only returns currencies from the CURRENCY_SYMBOLS allow-list', () => {
      const list = getCurrencyList('en')
      expect(list.length).toBeGreaterThan(50)
      for (const option of list) {
        expect(option.code in CURRENCY_SYMBOLS).toBe(true)
      }
    })

    it('includes symbol + localized name for every option', () => {
      const list = getCurrencyList('en')
      const eur = list.find(o => o.code === 'EUR')
      expect(eur?.symbol).toBe('€')
      expect(eur?.name).toBe('Euro')
      const usd = list.find(o => o.code === 'USD')
      expect(usd?.symbol).toBe('$')
      expect(usd?.name).toBe('US Dollar')
    })

    it('is sorted by the localized name', () => {
      const list = getCurrencyList('en')
      const names = list.map(o => o.name)
      const sorted = [...names].sort((a, b) => a.localeCompare(b, 'en'))
      expect(names).toEqual(sorted)
    })

    it('localizes names per locale', () => {
      const list = getCurrencyList('pt')
      const eur = list.find(o => o.code === 'EUR')
      expect(eur?.name).toBe('Euro')
    })
  })
})
