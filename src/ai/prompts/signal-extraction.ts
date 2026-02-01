export const SIGNAL_EXTRACTION_PROMPT = `Analyze this trading signal image and extract the following information:

1. **Symbol**: The trading pair or stock symbol (e.g., BTC, ETH, AAPL, BTCUSDT)
2. **Action**: Whether this is a LONG (buy) or SHORT (sell) signal
3. **Entry Price**: The recommended entry price
4. **Stop Loss**: The stop loss price (if visible)
5. **Take Profit**: The take profit price(s) (if visible)
6. **Leverage**: The recommended leverage (if mentioned)

Look for:
- Chart annotations showing entry, SL, TP levels
- Text overlays with trading instructions
- Price levels marked on the chart
- Direction indicators (arrows, lines)

Return ONLY valid JSON with these exact fields. If a field is not found, omit it (don't use null):

{
  "symbol": "string - trading symbol",
  "action": "LONG or SHORT",
  "entry": number,
  "stopLoss": number (optional),
  "takeProfit": number (optional),
  "leverage": number (optional),
  "confidence": number between 0 and 1
}

Important:
- confidence should reflect how certain you are about the extracted data
- If you cannot determine the action, default to LONG
- Normalize symbols (remove /USDT suffix)
- All prices should be positive numbers`;

export const SIGNAL_EXTRACTION_SYSTEM = `You are a trading signal extraction AI. Your job is to analyze trading chart images and extract structured signal data. Be precise with numbers and conservative with confidence scores. If information is unclear or ambiguous, reflect that in a lower confidence score.`;
