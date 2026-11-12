import assert from 'node:assert/strict'
import test from 'node:test'
import { createAlert, findAlert, listAlerts, listDisasters, useMockData } from './repository.js'

test('default repository exposes no mock alerts or categories', async () => {
  assert.equal(useMockData, false)
  assert.deepEqual(await listAlerts(), [])
  assert.equal(await findAlert('DAH-260927-001'), null)
  assert.deepEqual(await listDisasters(), [])
  await assert.rejects(() => createAlert({ alertId: 'test-alert' }), /disabled/)
})
