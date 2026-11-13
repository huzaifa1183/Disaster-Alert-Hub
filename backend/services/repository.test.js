import assert from 'node:assert/strict'
import test from 'node:test'
import { addReport, clearReports, createAlert, createNotification, findAlert, listAlerts, listDisasters, listNotifications, listReports, listVerifiedReports, updateReport, useMockData } from './repository.js'

test('default repository exposes no mock alerts or categories', async () => {
  assert.equal(useMockData, false)
  assert.deepEqual(await listAlerts(), [])
  assert.equal(await findAlert('DAH-260927-001'), null)
  assert.deepEqual(await listDisasters(), [])
  await assert.rejects(() => createAlert({ alertId: 'test-alert' }), /disabled/)
})

test('community reports start pending and admins can update and verify them', async () => {
  const report = await addReport({ text: 'Flood water is rising near the bridge.', location: 'North district', category: 'Flood' })
  assert.equal(report.status, 'Pending')
  assert.equal(report.source, 'Citizen report')
  assert.deepEqual(await listVerifiedReports(), [])

  const updated = await updateReport(report._id, { text: 'Flood water is rising near the main bridge.', status: 'Verified' })
  assert.equal(updated.text, 'Flood water is rising near the main bridge.')
  assert.equal(updated.status, 'Verified')
  assert.ok(updated.updatedAt)
  assert.equal(await updateReport('missing-report', { status: 'Rejected' }), null)
  assert.deepEqual(await listVerifiedReports(), [updated])

  const rejected = await updateReport(report._id, { status: 'Rejected' })
  assert.equal(rejected.status, 'Rejected')
  assert.deepEqual(await listVerifiedReports(), [])

  await createNotification({ type: 'report', title: 'New report', message: 'A report was submitted.' })
  const cleared = await clearReports()
  assert.equal(cleared.reportsDeleted, 1)
  assert.equal(cleared.notificationsDeleted, 1)
  assert.deepEqual(await listReports(), [])
  assert.deepEqual(await listNotifications(), [])
})
