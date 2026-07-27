'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, Link2Off, ImagePlus, Undo2, Redo2,
} from 'lucide-react';
import { MediaPicker } from '@/components/media/MediaPicker';
import type { AdminMedia } from '@/types/media';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * TipTap-based rich-text editor producing HTML. The HTML is sanitized again
 * server-side on save (see HtmlSanitizerService) — never trust this output.
 */
export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const editor = useEditor({
    // Avoid SSR hydration mismatch in the Next.js App Router.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      ImageExtension.configure({ inline: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[240px] px-4 py-3 focus:outline-none',
      },
    },
  });

  // Keep the editor in sync when the parent replaces `value` (e.g. loading an
  // existing page). Guard against feedback loops from our own onUpdate.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const insertImage = useCallback(
    (media: AdminMedia) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: media.url, alt: media.alt || media.original_name }).run();
      setPickerOpen(false);
    },
    [editor],
  );

  if (!editor) {
    return (
      <div className="border border-white bg-black min-h-[240px] flex items-center justify-center text-mono-light-grey text-sm">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="border border-white bg-black">
      <Toolbar
        editor={editor}
        onLink={setLink}
        onImage={() => setPickerOpen(true)}
      />
      <EditorContent editor={editor} />
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={insertImage}
      />
    </div>
  );
}

function Toolbar({
  editor,
  onLink,
  onImage,
}: {
  editor: Editor;
  onLink: () => void;
  onImage: () => void;
}) {
  const btn = (active: boolean) =>
    `p-2 border transition-colors ${
      active
        ? 'bg-white text-black border-white'
        : 'border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white'
    }`;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-mono-dark-grey">
      <button type="button" aria-label="Bold" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Italic" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Strikethrough" className={btn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="w-4 h-4" />
      </button>
      <span className="w-px bg-mono-dark-grey mx-1" aria-hidden="true" />
      <button type="button" aria-label="Heading 2" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Heading 3" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Bullet list" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Ordered list" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Blockquote" className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="w-4 h-4" />
      </button>
      <span className="w-px bg-mono-dark-grey mx-1" aria-hidden="true" />
      <button type="button" aria-label="Add link" className={btn(editor.isActive('link'))} onClick={onLink}>
        <Link2 className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Remove link" className={btn(false)} onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')}>
        <Link2Off className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Insert image" className={btn(false)} onClick={onImage}>
        <ImagePlus className="w-4 h-4" />
      </button>
      <span className="w-px bg-mono-dark-grey mx-1" aria-hidden="true" />
      <button type="button" aria-label="Undo" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Redo" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default RichTextEditor;
