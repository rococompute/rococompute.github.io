/*
  Soma for highlight.js (v11).

  Soma is Rocq's language (Gallina and its commands) with additions:
  definitions with no keyword (`square (x : N) : N := x * x.`), Recursive
  and Explore, the gradual typing words (Any, unk, raise, cast), and
  numbers with a scope (`12%N`, `(-3)%Z`). Rocq's notations, Soma's .ext
  macros and JSX change the syntax as a file is read, so a fixed grammar
  like this one only colours what it can see: comments, strings, keywords,
  definitions, numbers and scopes.

  It also registers soma-lisp: the s-expressions of Soma's lisp reader (a
  file starting with `#lang lisp`), with its forms define, define-any,
  lambda, if, let and match.

  In a page:  <script src="highlight.min.js"></script>
              <script src="/js/soma.js"></script>
              <pre><code class="language-soma">...</code></pre>
              <pre><code class="language-soma-lisp">...</code></pre>
  In Node:    var soma = require('./soma.js')
              hljs.registerLanguage('soma', soma)
              hljs.registerLanguage('soma-lisp', soma.lisp)
*/
(function () {
  function soma(hljs) {
    var IDENT = /[A-Za-z_][\w']*/;

    // Rocq comments nest; (** ... *) is a doc comment.
    var COMMENT = hljs.COMMENT(/\(\*/, /\*\)/, { contains: ['self'] });

    // Rocq strings escape a quote by doubling it: "say ""hi""".
    var STRING = {
      scope: 'string',
      begin: '"',
      end: '"',
      contains: [{ begin: '""' }]
    };

    // 12, 12%N, 0x1F, 3.5
    var NUMBER = {
      scope: 'number',
      begin: /\b(?:0[xX][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)(?:%[A-Za-z_][\w']*)?/,
      relevance: 0
    };

    // the scope after a parenthesis: (-3)%Z
    var SCOPE = {
      scope: 'meta',
      begin: /(?<=\))%[A-Za-z_][\w']*/,
      relevance: 0
    };

    // Definition foo, Fixpoint foo, Recursive foo, Lemma foo, ...
    var NAMED = {
      begin: [
        /\b(?:Definition|Fixpoint|CoFixpoint|Recursive|Inductive|CoInductive|Record|Structure|Class|Instance|Example|Lemma|Theorem|Corollary|Fact|Remark|Let|Axiom|Parameter|Variable|Hypothesis|Notation|Module|Section)\b/,
        /\s+/,
        IDENT
      ],
      beginScope: { 1: 'keyword', 3: 'title.function' }
    };

    // A qualified name (N.even, Nat.mul) stays plain: its module isn't the
    // type N, nor its last part a keyword.
    var QUALIFIED = {
      begin: /\b[A-Za-z_][\w']*(?:\.[A-Za-z_][\w']*)+/,
      relevance: 0
    };

    // Soma's definitions with no keyword: a name at the start of a line,
    // then its arguments, then := on the same line.
    var BARE_DEFINITION = {
      scope: 'title.function',
      begin: /^[a-z_][\w']*(?=[^\n]*?:=)/,
      relevance: 5
    };

    // Waterproof's proof sentences: Take x : T. By h, it suffices to show
    // that ... We conclude that ...
    var SENTENCE = {
      scope: 'keyword',
      begin: /\b(?:Take|Assume that|We conclude that|We need to show that|it suffices to show that|It suffices to show that)\b|(?<=^[ \t]*)By\b/,
      relevance: 0
    };

    return {
      name: 'Soma',
      aliases: ['soma'],
      keywords: {
        $pattern: /[A-Za-z_][\w']*/,
        keyword: [
          // commands
          'Definition', 'Fixpoint', 'CoFixpoint', 'Recursive', 'Inductive', 'CoInductive',
          'Record', 'Structure', 'Class', 'Instance', 'Example', 'Lemma', 'Theorem',
          'Corollary', 'Fact', 'Remark', 'Proof', 'Qed', 'Defined', 'Admitted', 'Abort',
          'Axiom', 'Parameter', 'Variable', 'Variables', 'Hypothesis', 'Context',
          'Require', 'Import', 'Export', 'From', 'Module', 'Section', 'End',
          'Notation', 'Infix', 'Arguments', 'Implicit', 'Open', 'Close', 'Scope',
          'Local', 'Global', 'Hint', 'Fail', 'Compute', 'Eval', 'Check', 'Print',
          'Search', 'Set', 'Unset', 'Explore', 'Rocq', 'Library', 'Let',
          // terms
          'match', 'with', 'end', 'fun', 'let', 'in', 'if', 'then', 'else',
          'return', 'as', 'forall', 'exists', 'fix', 'cofix', 'struct'
        ],
        built_in: ['unk', 'raise', 'cast'],
        type: [
          'Any', 'Type', 'Prop', 'SProp',
          'nat', 'N', 'Z', 'Q', 'bool', 'string', 'ascii', 'list', 'option',
          'prod', 'sum', 'unit', 'io'
        ],
        literal: ['true', 'false', 'tt', 'None', 'Some', 'nil', 'eq_refl', 'O', 'S', 'Succ']
      },
      contains: [
        COMMENT,
        STRING,
        SENTENCE,
        NAMED,
        BARE_DEFINITION,
        QUALIFIED,
        NUMBER,
        SCOPE,
        { scope: 'operator', begin: /:=|=>|->|<-|<->|\/\\|\\\/|<>|[=<>+*\-|^]/, relevance: 0 }
      ]
    };
  }

  // Soma's lisp reader: an atom is anything but spaces, parentheses, quotes
  // and semicolons, so make-adder and define-any are one word each.
  function somaLisp(hljs) {
    var ATOM = /[^\s()";]+/;
    return {
      name: 'Soma lisp',
      aliases: ['soma-lisp'],
      keywords: {
        $pattern: ATOM,
        keyword: ['define', 'define-any', 'lambda', 'if', 'let', 'match'],
        built_in: ['list', 'cons'],
        literal: ['#t', '#f', 'Succ', '_']
      },
      contains: [
        // #lang lisp: the line that picks the reader
        { scope: 'meta', begin: /^#lang\b.*$/ },
        hljs.COMMENT(';', '$'),
        { scope: 'string', begin: '"', end: '"', contains: [hljs.BACKSLASH_ESCAPE] },
        // (define (square x) ...), (define-any (countdown n) ...), (define add-ten ...)
        {
          begin: [/\(/, /define(?:-any)?/, /\s+\(?/, ATOM],
          beginScope: { 2: 'keyword', 4: 'title.function' }
        },
        { scope: 'number', begin: /(?<![^\s()])\d+(?![^\s()])/, relevance: 0 },
        // + - * / = < <= in a call's head
        { scope: 'operator', begin: /(?<=\()(?:<=|[-+*\/=<])(?=[\s)])/, relevance: 0 }
      ]
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    soma.lisp = somaLisp;
    module.exports = soma;
  } else if (typeof hljs !== 'undefined') {
    hljs.registerLanguage('soma', soma);
    hljs.registerLanguage('soma-lisp', somaLisp);
  }
})();
