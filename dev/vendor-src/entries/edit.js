import {EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, placeholder} from "@codemirror/view";
import {EditorState, Compartment} from "@codemirror/state";
import {defaultKeymap, history, historyKeymap, indentWithTab, undo, redo} from "@codemirror/commands";
import {searchKeymap, highlightSelectionMatches, openSearchPanel} from "@codemirror/search";
import {bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap, StreamLanguage} from "@codemirror/language";
import {autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap} from "@codemirror/autocomplete";
import {oneDark} from "@codemirror/theme-one-dark";
import {javascript} from "@codemirror/lang-javascript";
import {json} from "@codemirror/lang-json";
import {markdown} from "@codemirror/lang-markdown";
import {html} from "@codemirror/lang-html";
import {css} from "@codemirror/lang-css";
import {xml} from "@codemirror/lang-xml";
import {yaml} from "@codemirror/lang-yaml";
import {python} from "@codemirror/lang-python";
import {sql} from "@codemirror/lang-sql";
import {c,cpp,java,csharp,kotlin,scala,objectiveC,dart} from "@codemirror/legacy-modes/mode/clike";
import {go} from "@codemirror/legacy-modes/mode/go";import {rust} from "@codemirror/legacy-modes/mode/rust";import {shell} from "@codemirror/legacy-modes/mode/shell";
import {ruby} from "@codemirror/legacy-modes/mode/ruby";import {swift} from "@codemirror/legacy-modes/mode/swift";import {lua} from "@codemirror/legacy-modes/mode/lua";
import {perl} from "@codemirror/legacy-modes/mode/perl";import {r} from "@codemirror/legacy-modes/mode/r";import {powerShell} from "@codemirror/legacy-modes/mode/powershell";
import {toml} from "@codemirror/legacy-modes/mode/toml";import {properties} from "@codemirror/legacy-modes/mode/properties";import {dockerFile} from "@codemirror/legacy-modes/mode/dockerfile";
import {diff} from "@codemirror/legacy-modes/mode/diff";import {haskell} from "@codemirror/legacy-modes/mode/haskell";import {nginx} from "@codemirror/legacy-modes/mode/nginx";
import {stex} from "@codemirror/legacy-modes/mode/stex";import {cmake} from "@codemirror/legacy-modes/mode/cmake";
const SL=function(m){return function(){return StreamLanguage.define(m);};};
const LANGS={c:SL(c),h:SL(c),cpp:SL(cpp),cc:SL(cpp),cxx:SL(cpp),hpp:SL(cpp),java:SL(java),cs:SL(csharp),kt:SL(kotlin),scala:SL(scala),m:SL(objectiveC),dart:SL(dart),go:SL(go),rs:SL(rust),sh:SL(shell),bash:SL(shell),zsh:SL(shell),rb:SL(ruby),swift:SL(swift),lua:SL(lua),pl:SL(perl),r:SL(r),ps1:SL(powerShell),toml:SL(toml),ini:SL(properties),cfg:SL(properties),conf:SL(properties),properties:SL(properties),dockerfile:SL(dockerFile),diff:SL(diff),patch:SL(diff),hs:SL(haskell),tex:SL(stex),cmake:SL(cmake),nginx:SL(nginx),
js:()=>javascript(),mjs:()=>javascript(),cjs:()=>javascript(),jsx:()=>javascript({jsx:true}),ts:()=>javascript({typescript:true}),tsx:()=>javascript({typescript:true,jsx:true}),
 json:()=>json(),jsonc:()=>json(),md:()=>markdown(),markdown:()=>markdown(),html:()=>html(),htm:()=>html(),css:()=>css(),xml:()=>xml(),svg:()=>xml(),xsl:()=>xml(),yml:()=>yaml(),yaml:()=>yaml(),py:()=>python(),sql:()=>sql()};
function langFor(ext){var f=LANGS[ext];return f?f():[];}
function create(parent,doc,o){
  o=o||{};
  var wrap=new Compartment(), theme=new Compartment(), ro=new Compartment();
  var exts=[lineNumbers(),highlightActiveLineGutter(),history(),foldGutter(),drawSelection(),dropCursor(),EditorState.allowMultipleSelections.of(true),indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle,{fallback:true}),bracketMatching(),closeBrackets(),autocompletion(),rectangularSelection(),crosshairCursor(),highlightActiveLine(),highlightSelectionMatches(),
    keymap.of([...closeBracketsKeymap,...defaultKeymap,...searchKeymap,...historyKeymap,...foldKeymap,...completionKeymap,indentWithTab]),
    langFor(o.ext||""),wrap.of(o.wrap?EditorView.lineWrapping:[]),theme.of(o.dark?oneDark:[]),ro.of(EditorState.readOnly.of(!!o.readOnly)),
    EditorView.updateListener.of(function(u){if(u.docChanged&&o.onChange)o.onChange(u);}),
    EditorView.theme({"&":{height:"100%",fontSize:"14px"},".cm-scroller":{fontFamily:"ui-monospace,Menlo,Consolas,monospace",lineHeight:"1.5"},".cm-gutters":{userSelect:"none"}})];
  var view=new EditorView({state:EditorState.create({doc:doc,extensions:exts}),parent:parent});
  return {view:view,
    get:function(){return view.state.doc.toString();},
    setWrap:function(on){view.dispatch({effects:wrap.reconfigure(on?EditorView.lineWrapping:[])});},
    setDark:function(on){view.dispatch({effects:theme.reconfigure(on?oneDark:[])});},
    find:function(){openSearchPanel(view);},
    setReadOnly:function(on){view.dispatch({effects:ro.reconfigure(EditorState.readOnly.of(!!on))});},
    setDoc:function(t){view.dispatch({changes:{from:0,to:view.state.doc.length,insert:t}});},
    undo:function(){undo(view);},redo:function(){redo(view);},
    focus:function(){view.focus();},
    destroy:function(){view.destroy();}};
}
window.AtlasEdit={create:create};
