Start a structured debugging session using the debugger agent.

1. Ask the user to describe the bug: what they expected vs what happened.
2. Delegate to the debugger agent with the bug description and any relevant file paths.
3. Follow the 7-phase protocol: reproduce → isolate → hypothesize → test → fix → verify → document.
4. Run pnpm exec vitest run to confirm the fix. Report the root cause and regression test.
