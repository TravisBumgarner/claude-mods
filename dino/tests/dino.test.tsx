import { expect, mock, test } from 'claude-code/testing'
import type { RenderPropsOf } from 'claude-code'

const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 18, bodyColumns: 80 } as unknown as RenderPropsOf['AbovePrompt']

test('pausing saves the score, D resumes after a countdown', async ($, on) => {
  mock.store(on)
  mock.clock(on)

  await $.tool.call({ tool: 'mcp__dino-break__start_break', reason: 'test' } as never)

  const ui = await $.ui.mount({
    plugin: 'dino-break',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: BAND_PROPS,
    viewport: { columns: 80, rows: 20 },
  })
  expect(await ui.find({ text: /D to start/ })).toBeDefined()

  await ui.key({ key: 'd', in: 'game' })
  expect(await ui.find({ text: /Get ready/ })).toBeDefined()
  await ui.advance(3100)
  await ui.advance(500)
  expect(await ui.find({ text: /P: pause/ })).toBeDefined()

  await ui.key({ key: 'p', in: 'game' })
  expect(await ui.find({ text: /PAUSED, score saved/ })).toBeDefined()

  await ui.key({ key: 'd', in: 'game' })
  expect(await ui.find({ text: /Get ready/ })).toBeDefined()
  await ui.unmount()
})
