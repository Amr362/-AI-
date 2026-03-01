export function normalizeSpeech(body) {
  const speech = (body.SpeechResult || body.speechResult || "").trim();
  return {
    speech,
    confidence: Number(body.Confidence || body.confidence || 0),
    callSid: body.CallSid,
    from: body.From
  };
}
