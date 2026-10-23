
import { useEffect, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { parse } from 'acorn'
import { validateMission, type MissionTestResult } from './missionTests'
import './Mission.css'

const starterCode = `let score = 0;

// TODO: امتیاز را 10 واحد افزایش بده
score = score + 10;

console.log("امتیاز بازیکن:", score);
`

const sandboxDocument = `
<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
  function format(value) {
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value) ?? String(value); }
    catch { return String(value); }
  }

  window.addEventListener('message', (event) => {
    const data = event.data;

    if (!data || data.type !== 'CODEQUEST_RUN' ||
        typeof data.code !== 'string') return;

    const send = (type, value) => {
      parent.postMessage({
        source: 'CODEQUEST_SANDBOX',
        type,
        value
      }, '*');
    };

    const safeConsole = {
      log: (...args) => send('log', args.map(format).join(' ')),
      info: (...args) => send('log', args.map(format).join(' ')),
      warn: (...args) => send('warn', args.map(format).join(' ')),
      error: (...args) => send('error', args.map(format).join(' '))
    };

    try {
      const result = new Function(
        'console',
        data.code + '\\n; return typeof score !== "undefined" ? score : undefined;'
      )(safeConsole);

      send('result', result);
    } catch (error) {
      const message =error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack || '' : '';
      const match = stack.match(/<anonymous>:(\d+):(\d+)/);
      // شماره خط تقریبی در کد دانش‌آموز؛
     // ممکن است در بعضی موتورهای مرورگر در دسترس نباشد.
       const line = match ? Math.max(1, Number(match[1]) - 2) : null;
       if (line) {
            send('error', 'خط ' + line + ': ' + message);
            } else {
            send('error', message);
            }
    }
  });
</script>
</body>
</html>
`

type OutputLine = {
  id: number
  type: 'log' | 'warn' | 'error' | 'success'
  text: string
}

function Mission({ onBack }: { onBack?: () => void }) {
  const [code, setCode] = useState(starterCode)
  const [output, setOutput] = useState<OutputLine[]>([])
  const [testResults, setTestResults] = useState<MissionTestResult[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [hintVisible, setHintVisible] = useState(false)

  const frameRef = useRef<HTMLIFrameElement>(null)
  const nextId = useRef(0)

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
const monacoRef = useRef<Parameters<OnMount>[1] | null>(null)

const handleEditorMount: OnMount = (editor, monaco) => {
  editorRef.current = editor
  monacoRef.current = monaco
}

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return

      const data = event.data
      if (!data || data.source !== 'CODEQUEST_SANDBOX') return

      if (data.type === 'result') {
        const results = validateMission(2, data.value)
        setTestResults(results)
        setHasRun(true)
        return
      }

     
        if (['log', 'warn', 'error'].includes(data.type)) {
        const rawMessage = String(data.value ?? 'undefined')
        const displayMessage =
            data.type === 'error'
            ? translateJsError(rawMessage)
            : rawMessage

        setOutput((current) => [
            ...current,
            {
            id: nextId.current++,
            type: data.type,
            text: displayMessage,
            },
        ])
        }

    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
  const editor = editorRef.current
  const monaco = monacoRef.current
  const model = editor?.getModel()

  if (!editor || !monaco || !model) return

  const markers = []

  try {
    parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'script',
    })
  } catch (error) {
    const syntaxError = error as Error & {
      loc?: { line: number; column: number }
    }

    if (syntaxError.loc) {
      markers.push({
        startLineNumber: syntaxError.loc.line,
        endLineNumber: syntaxError.loc.line,
        startColumn: syntaxError.loc.column + 1,
        endColumn: syntaxError.loc.column + 2,
        message: `خطای نحوی: ${syntaxError.message}`,
        severity: monaco.MarkerSeverity.Error,
      })
    }
  }

  monaco.editor.setModelMarkers(model, 'codequest', markers)
}, [code])
  function showSyntaxError(
  line: number,
  column: number,
  message: string,
) {
  const editor = editorRef.current
  const monaco = monacoRef.current

  if (!editor || !monaco) return

  const model = editor.getModel()
  if (!model) return

  const safeLine = Math.min(
    Math.max(1, line),
    model.getLineCount(),
  )

  const maxColumn = model.getLineMaxColumn(safeLine)
  const safeColumn = Math.min(
    Math.max(1, column + 1),
    maxColumn,
  )

  monaco.editor.setModelMarkers(model, 'codequest', [
    {
      startLineNumber: safeLine,
      endLineNumber: safeLine,
      startColumn: safeColumn,
      endColumn: Math.min(safeColumn + 1, maxColumn),
      message: `خطای نحوی: ${message}`,
      severity: monaco.MarkerSeverity.Error,
    },
  ])

  editor.revealLineInCenter(safeLine)
}

 function runCode() {
  setOutput([])
  setTestResults([])
  setHasRun(false)

  const model = editorRef.current?.getModel()

if (model) {
  monacoRef.current?.editor.setModelMarkers(model, 'codequest', [])
}


  // بررسی خطاهای نحوی و شماره خط دقیق
  try {
    parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'script',
    })
  } catch (error) {
    const syntaxError = error as Error & {
      loc?: { line: number; column: number }
    }

    const line = syntaxError.loc?.line
    const column = syntaxError.loc?.column

    showSyntaxError(
  line ?? 1,
  column ?? 0,
  syntaxError.message,
)

    setOutput([{
      id: nextId.current++,
      type: 'error',
      text: line
        ? `خط ${line}، ستون ${(column ?? 0) + 1}: خطای نحوی — ${syntaxError.message}`
        : `خطای نحوی: ${syntaxError.message}`,
    }])

    return
  }

  const frame = frameRef.current
  if (!frame?.contentWindow) return

  frame.contentWindow.postMessage(
    { type: 'CODEQUEST_RUN', code },
    '*',
  )
}

  function resetCode() {
    setCode(starterCode)
    setOutput([])
    setTestResults([])
    setHasRun(false)
    
    setHintVisible(false)
  }

  const passed = testResults.length > 0 && testResults.every((test) => test.passed)

  return (
    <div className="mission-page" dir="rtl">
      <header className="mission-topbar">
        <button
          className="back-button"
          onClick={onBack ?? (() => window.history.back())}
        >
          ← بازگشت
        </button>

        <div className="mission-brand">
          <span className="brand-mark">CQ</span>
          <span>CodeQuest</span>
        </div>

        <span className="level-label">مرحله ۲ از ۱۲</span>
      </header>

      <main className="mission-layout">
        <section className="mission-workspace">
          <div className="mission-heading">
            <div>
              <span className="eyebrow">مأموریت شماره ۰۲</span>
              <h1>جادوی متغیرها</h1>
              <p>با متغیرها، امتیاز بازیکن را تغییر بده.</p>
            </div>
            <span className="mission-icon">🧪</span>
          </div>

          <section className="editor-card">
            <div className="editor-toolbar">
              <div className="file-label">
                <span className="js-badge">JS</span>
                <span>mission.js</span>
              </div>

              <div className="editor-actions">
                <button className="reset-button" onClick={resetCode}>
                  بازنشانی
                </button>
                <button className="run-button" onClick={runCode}>
                  ▶ اجرای کد و بررسی
                </button>
              </div>
            </div>

            <div className="monaco-container">
              <Editor
                height="360px"
                language="javascript"
                theme="vs-dark"
                value={code}
                onChange={(value) => {
                  setCode(value ?? '')
                  setHasRun(false)
                  setTestResults([])
                  const model = editorRef.current?.getModel()
                    if (model) {
                        monacoRef.current?.editor.setModelMarkers(model, 'codequest', [])
                    }
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 15,
                  fontFamily: 'Consolas, monospace',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  padding: { top: 16 },
                }}

                onMount={handleEditorMount}
              />
            </div>

            <div className="console-header">
              <span>خروجی برنامه</span>
              <button onClick={() => setOutput([])}>پاک کردن خروجی</button>
            </div>

            <div className="console-output" aria-live="polite">
              {output.length === 0 ? (
                <p className="empty-output">
                  هنوز خروجی‌ای وجود ندارد. کدت را اجرا کن.
                </p>
              ) : (
                output.map((line) => (
                  <div className={`output-line ${line.type}`} key={line.id}>
                    <span>{line.type === 'error' ? '✖' : '›'}</span>
                    <code>{line.text}</code>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={`completion-card ${passed ? 'completed' : ''}`}>
            <div>
              <strong>
                {!hasRun
                  ? 'آماده‌ای کدت را امتحان کنی؟'
                  : passed
                    ? 'آفرین! آزمون مأموریت قبول شد 🎉'
                    : 'هنوز مأموریت کامل نشده است'}
              </strong>
              <p>
                {!hasRun
                  ? 'کدت را اجرا کن تا نتیجه و آزمون خودکار را ببینی.'
                  : passed
                    ? 'امتیاز نهایی درست است. می‌توانیم مرحله بعد را باز کنیم.'
                    : 'پیام آزمون را بررسی کن، کدت را اصلاح کن و دوباره اجرا کن.'}
              </p>
            </div>
            {passed && <span className="completion-check">✓</span>}
          </section>

          {hasRun && (
            <section className="test-results">
              <h2>نتیجه آزمون خودکار</h2>
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className={`test-result ${test.passed ? 'pass' : 'fail'}`}
                >
                  <span>{test.passed ? '✓' : '✗'}</span>
                  <span>{test.message}</span>
                </div>
              ))}
            </section>
          )}
        </section>

        <aside className="mission-sidebar">
          <section className="instruction-card">
            <span className="card-kicker">🎯 هدف مأموریت</span>
            <h2>امتیاز را افزایش بده</h2>
            <p>
              متغیر <code>score</code> امتیاز بازیکن را نگه می‌دارد.
              مقدار آن را ۱۰ واحد افزایش بده.
            </p>

            <div className="task-box">
              <strong>کارهایی که باید انجام بدهی:</strong>
              <ul>
                <li>مقدار اولیه score را پیدا کن.</li>
                <li>امتیاز را ۱۰ واحد افزایش بده.</li>
                <li>مقدار نهایی را با console.log نمایش بده.</li>
              </ul>
            </div>

            <button
              className="hint-button"
              onClick={() => setHintVisible((visible) => !visible)}
            >
              {hintVisible ? 'پنهان کردن راهنما' : '💡 راهنمایی می‌خواهم'}
            </button>

            {hintVisible && (
              <div className="hint-box">
                می‌توانی بنویسی: <code>score = score + 10;</code>
                <br />
                یا از شکل کوتاه‌تر استفاده کنی: <code>score += 10;</code>
              </div>
            )}
          </section>

          <section className="concept-card">
            <span className="card-kicker">📘 نکته آموزشی</span>
            <h3>متغیر چیست؟</h3>
            <p>
              متغیر نامی برای نگهداری مقدار است. با <code>let</code> می‌توان
              متغیری ساخت که مقدارش در ادامه تغییر کند.
            </p>
            <pre><code>{'let score = 0;\nscore += 10;'}</code></pre>
          </section>

          <div className="progress-card">
            <div className="progress-label">
              <span>پیشرفت دوره</span>
              <strong>{passed ? '۲ از ۱۲' : '۱ از ۱۲'}</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: passed ? '16.666%' : '8.333%' }} />
            </div>
            <small>
              {passed
                ? 'مأموریت با موفقیت بررسی شد.'
                : 'هر مأموریت، یک قدم به قهرمان شدن نزدیک‌ترت می‌کند.'}
            </small>
          </div>
        </aside>
      </main>

      <iframe
        ref={frameRef}
        title="محیط اجرای کد دانش‌آموز"
        sandbox="allow-scripts"
        srcDoc={sandboxDocument}
        className="sandbox-frame"
        aria-hidden="true"
      />
    </div>
  )
}


function translateJsError(raw: string): string {
  const message = raw.trim()

  if (/Unexpected token/i.test(message)) {
    const token = message.match(/Unexpected token\s*['"`]?(.+?)['"`]?$/i)?.[1]

    return token
      ? `خطای نحوی: عبارت جاوااسکریپت معتبر نیست؛ نزدیک علامت یا عبارت «${token}» را بررسی کن.`
      : 'خطای نحوی: ساختار کد معتبر نیست. علامت‌ها و عبارت‌های اطراف خطا را بررسی کن.'
  }

  if (/Unexpected end of input/i.test(message)) {
    return 'خطای نحوی: کد زودتر از انتظار تمام شده است. پرانتزها، آکولادها و کوتیشن‌های باز را بررسی کن.'
  }

  if (/missing \) after argument list/i.test(message)) {
    return 'خطای نحوی: احتمالاً یک پرانتز بسته ) جا افتاده است.'
  }

  if (/missing } after/i.test(message)) {
    return 'خطای نحوی: احتمالاً یک آکولاد بسته } جا افتاده است.'
  }

  if (/Unexpected identifier/i.test(message)) {
    return 'خطای نحوی: یک کلمه یا نام در جای نامناسبی قرار گرفته است. کد این بخش را بررسی کن.'
  }

  if (/is not defined/i.test(message)) {
    const name = message.match(/([A-Za-z_$][\w$]*) is not defined/i)?.[1]
    return `خطای نام‌گذاری: متغیر یا تابع ${name ? `«${name}» ` : ''}تعریف نشده است. املای نام و محل تعریف آن را بررسی کن.`
  }

  if (/Assignment to constant variable/i.test(message)) {
    return 'خطای مقداردهی: مقدار یک متغیر const را تغییر داده‌ای؛ برای مقدار قابل تغییر از let استفاده کن.'
  }

  if (/Cannot read properties of undefined/i.test(message)) {
    return 'خطای دسترسی به داده: تلاش شده از مقداری که undefined است، یک ویژگی خوانده شود.'
  }

  if (/Cannot read properties of null/i.test(message)) {
    return 'خطای دسترسی به داده: تلاش شده از مقدار null، یک ویژگی خوانده شود.'
  }

  if (/is not a function/i.test(message)) {
    return 'خطای اجرا: چیزی که فراخوانی شده، تابع نیست. نام تابع و نوع مقدار را بررسی کن.'
  }

  if (/SyntaxError/i.test(message)) {
    return `خطای نحوی: ${message}`
  }

  if (/TypeError/i.test(message)) {
    return `خطای نوع داده: ${message}`
  }

  if (/ReferenceError/i.test(message)) {
    return `خطای متغیر یا مرجع: ${message}`
  }

  return `خطا: ${message}`
}


export default Mission
