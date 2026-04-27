import { useEffect, useRef } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentWithTab } from '@codemirror/commands';

const CodeEditor = ({ value, onChange }) => {
  const containerRef = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const extensions = [
      basicSetup,
      javascript({ jsx: false }),
      oneDark,
      keymap.of([indentWithTab]),
      EditorView.updateListener.of(update => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
      EditorView.theme({
        '&': { height: '60vh', borderRadius: '10px', overflow: 'hidden', fontSize: '13px' },
        '.cm-scroller': { fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace', lineHeight: '1.65', overflowY: 'auto' },
        '.cm-content': { padding: '12px 0' },
        '.cm-gutters': { borderRight: '1px solid rgba(255,255,255,0.06)' },
      }),
    ];
    const view = new EditorView({
      state: EditorState.create({ doc: value || '', extensions }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value || '' } });
    }
  }, [value]);

  return <div ref={containerRef} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }} />;
};

export default CodeEditor;
