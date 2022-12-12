declare module 'safe-eval' {
  function safeEval(code: string, context: object, opts: object = undefined);

  export = safeEval;
}
