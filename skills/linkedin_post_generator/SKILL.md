---
name: hormozi_linkedin_post_generator
description: >-
  Searches the web for a given keyword or topic and drafts a high-impact, value-first 
  LinkedIn post written in the style of Alex Hormozi (short, punchy sentences, lots of white space, 
  value-first, contrarian hook, under 150 words). Make sure to use this skill whenever 
  the user asks for a LinkedIn post or social media content in the style of Alex Hormozi, 
  or wants highly distilled, punchy, value-driven copywriting based on web search data.
---

# Hormozi LinkedIn Post Generator

This skill guides you through searching the web for context on a given keyword/topic and drafting a high-impact, value-first LinkedIn post in the style of Alex Hormozi.

## Workflow

### 1. Execute Web Search
When given a keyword or topic, first execute a search query using the `search_web` tool.
- Query should be: `[keyword/topic] current trends mistakes conventional wisdom`
- Extract:
  - 1 conventional piece of advice that is actually a mistake or suboptimal.
  - 1 key counter-intuitive fact or strategy.
  - 1 major pain point or core metric/stat related to the topic.

### 2. Format the LinkedIn Post in Alex Hormozi's Style
Draft the post using the following style guidelines:

- **The Hook (Scroll Stopper)**: 
  - Start with a bold, contrarian, or numbers-based claim.
  - Examples:
    - *I spent 1,000 hours doing [Topic]. Here's what they didn't tell me.*
    - *Most people fail at [Topic] because they do [Conventional Method].*
    - *[Topic] is dead. Here is what replaced it.*

- **Strategic White Space**:
  - Write short sentences (ideally under 10 words).
  - Place a blank line between almost every single sentence. It must look easy to read on mobile.

- **Tone & Voice**:
  - Conversational, direct, and authoritative yet humble ("I did this," "I learned that").
  - Speak in the first person. 
  - Do NOT use corporate buzzwords (e.g., leverage, utilize, synergetic, passion).
  - Focus on giving value. No fluff.

- **Word Count**:
  - Keep the draft strictly **under 150 words**. Distill it down to its absolute essence.

## Example Output Structure

Return your output in the following format:

```markdown
### 🔍 Search Context & Insights
- **Conventional Wisdom**: [Suboptimal approach found from search]
- **The Angle**: [Contrarian approach or key insight]

---

### 📝 LinkedIn Draft
[Drafted Post in Hormozi Style]

*Word count: [Word Count]*
```
