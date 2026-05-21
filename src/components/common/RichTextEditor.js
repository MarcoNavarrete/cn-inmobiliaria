import React, { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { prepareRichTextForEditor } from '../../utils/richText';
import './RichTextEditor.css';

const toolbarButtonClass = (active) => `rich-text-editor__button ${active ? 'is-active' : ''}`.trim();

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Escribe la descripción...',
  disabled = false,
}) {
  const initialContent = useMemo(() => prepareRichTextForEditor(value), [value]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent || '<p></p>',
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'rich-text-editor__content',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
  });

  const nextHtml = initialContent || '';

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    const normalizedNext = nextHtml.trim();
    const normalizedCurrent = (editor.getHTML() || '').trim();

    if (!normalizedNext) {
      if (normalizedCurrent !== '<p></p>') {
        editor.commands.clearContent(false);
      }
      return undefined;
    }

    if (normalizedCurrent !== normalizedNext) {
      editor.commands.setContent(normalizedNext, false);
    }

    return undefined;
  }, [editor, nextHtml]);

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    editor.setEditable(!disabled, false);
    return undefined;
  }, [disabled, editor]);

  const setParagraph = () => editor?.chain().focus().setParagraph().run();
  const setHeading2 = () => editor?.chain().focus().toggleHeading({ level: 2 }).run();
  const setHeading3 = () => editor?.chain().focus().toggleHeading({ level: 3 }).run();
  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const alignLeft = () => editor?.chain().focus().setTextAlign('left').run();
  const alignCenter = () => editor?.chain().focus().setTextAlign('center').run();
  const alignRight = () => editor?.chain().focus().setTextAlign('right').run();
  const alignJustify = () => editor?.chain().focus().setTextAlign('justify').run();
  const clearFormatting = () => editor?.chain().focus().unsetAllMarks().clearNodes().run();

  if (!editor) {
    return (
      <div className="rich-text-editor">
        <div className="rich-text-editor__shell is-loading">
          <p>Cargando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rich-text-editor ${disabled ? 'is-disabled' : ''}`.trim()}>
      <div className="rich-text-editor__toolbar" aria-label="Toolbar de formato">
        <button
          type="button"
          className={toolbarButtonClass(editor.isActive('paragraph'))}
          onMouseDown={(event) => event.preventDefault()}
          onClick={setParagraph}
          disabled={disabled}
        >
          Texto
        </button>
        <button
          type="button"
          className={toolbarButtonClass(editor.isActive('heading', { level: 2 }))}
          onMouseDown={(event) => event.preventDefault()}
          onClick={setHeading2}
          disabled={disabled}
        >
          H2
        </button>
        <button
          type="button"
          className={toolbarButtonClass(editor.isActive('heading', { level: 3 }))}
          onMouseDown={(event) => event.preventDefault()}
          onClick={setHeading3}
          disabled={disabled}
        >
          H3
        </button>
        <button
          type="button"
          className={toolbarButtonClass(editor.isActive('bold'))}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleBold}
          disabled={disabled}
        >
          B
        </button>
        <button
          type="button"
          className={toolbarButtonClass(editor.isActive('italic'))}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleItalic}
          disabled={disabled}
        >
          I
        </button>
        <button
          type="button"
          className={toolbarButtonClass(editor.isActive('underline'))}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleUnderline}
          disabled={disabled}
        >
          U
        </button>
        <button
          type="button"
          className={toolbarButtonClass(editor.isActive('bulletList'))}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleBulletList}
          disabled={disabled}
        >
          Viñetas
        </button>
        <button
          type="button"
          className={toolbarButtonClass(editor.isActive('orderedList'))}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleOrderedList}
          disabled={disabled}
        >
          1. Lista
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={alignLeft} disabled={disabled}>
          Izq.
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={alignCenter} disabled={disabled}>
          Centro
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={alignRight} disabled={disabled}>
          Der.
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={alignJustify} disabled={disabled}>
          Justificar
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={clearFormatting} disabled={disabled}>
          Limpiar
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
