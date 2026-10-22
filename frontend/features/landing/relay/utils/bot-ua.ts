export const BOT_UA =
  /lighthouse|googlebot|pagespeed|headlesschrome|gtmetrix|pingdom|bingbot|yandexbot|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|anthropic-ai|perplexitybot|perplexity-user|ccbot|bytespider|amazonbot|meta-externalagent|cohere-ai|mistralai-user|youbot|diffbot/i;

export const isBotClient = () =>
  typeof navigator !== "undefined" && BOT_UA.test(navigator.userAgent);

export const isBotUserAgent = (userAgent: string | null | undefined): boolean =>
  BOT_UA.test(userAgent ?? "");
