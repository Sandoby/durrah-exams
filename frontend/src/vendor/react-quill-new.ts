import ReactQuill from 'react-quill';
import * as ReactDOM from 'react-dom';

// Provide a minimal findDOMNode shim for React 19 compatibility; used by react-quill internals.
const domNamespace: any = ReactDOM as any;
const domDefault: any = domNamespace.default ?? domNamespace;

const shimFindDomNode = (instance: any) => {
  // Quill calls findDOMNode to locate the editor root; prefer root, else return instance as-is.
  return instance?.root ?? instance ?? null;
};

if (!domNamespace.findDOMNode) {
  Reflect.set(domNamespace, 'findDOMNode', shimFindDomNode);
}

if (!domDefault.findDOMNode) {
  Reflect.set(domDefault, 'findDOMNode', shimFindDomNode);
}

// Ensure default mirrors namespace for consumers using default import style.
Reflect.set(domNamespace, 'default', domDefault);

// Patch ReactQuill to bypass findDOMNode entirely; use the ref directly.
const QuillComponent: any = ReactQuill as any;
if (QuillComponent?.prototype?.getEditingArea) {
  QuillComponent.prototype.getEditingArea = function getEditingAreaPatched() {
    const element = this.editingArea as HTMLElement | null | undefined;
    if (!element) {
      throw new Error('Instantiating on missing editing area');
    }
    if ((element as any).nodeType === 3) {
      throw new Error('Editing area cannot be a text node');
    }
    return element;
  };
}

export default ReactQuill;
