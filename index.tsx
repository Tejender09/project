/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {GoogleGenAI, Chat, GroundingChunk} from '@google/genai';

// Per instructions, use process.env.API_KEY
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

async function main() {
  const responseElement = document.getElementById('response') as HTMLDivElement;
  const promptInputElement = document.getElementById('prompt-input') as HTMLInputElement;
  const sendButtonElement = document.getElementById('send-button') as HTMLButtonElement;
  const difficultyStarsContainer = document.getElementById('difficulty-stars') as HTMLDivElement;
  const starElements = document.querySelectorAll('.star') as NodeListOf<HTMLSpanElement>;
  const difficultyHoverLabel = document.getElementById('difficulty-hover-label') as HTMLDivElement;
  const actionQuestionsBtn = document.getElementById('action-questions-btn') as HTMLButtonElement;
  const actionNotesBtn = document.getElementById('action-notes-btn') as HTMLButtonElement;
  const actionExplainBtn = document.getElementById('action-explain-btn') as HTMLButtonElement;
  const actionExamBtn = document.getElementById('action-exam-btn') as HTMLButtonElement;
  const themeToggleButton = document.getElementById('theme-toggle-btn') as HTMLButtonElement;
  

  if (!responseElement || !promptInputElement || !sendButtonElement || !difficultyStarsContainer || !difficultyHoverLabel || !actionQuestionsBtn || !actionNotesBtn || !actionExplainBtn || !actionExamBtn || !themeToggleButton) {
    console.error("One or more required HTML elements are missing.");
    return;
  }
  
  function setFormEnabled(enabled: boolean) {
    promptInputElement.disabled = !enabled;
    sendButtonElement.disabled = !enabled;
    actionQuestionsBtn.disabled = !enabled;
    actionNotesBtn.disabled = !enabled;
    actionExplainBtn.disabled = !enabled;
    actionExamBtn.disabled = !enabled;

    if (enabled) {
        difficultyStarsContainer.classList.remove('disabled');
    } else {
        difficultyStarsContainer.classList.add('disabled');
    }
    if (enabled) {
      promptInputElement.focus();
    }
  }

  function displayError(message: string) {
    const errorElement = document.createElement('div');
    errorElement.className = 'message error';
    errorElement.textContent = message;
    responseElement.appendChild(errorElement);
    responseElement.scrollTop = responseElement.scrollHeight;
  }
  
  if (!process.env.API_KEY) {
    displayError('API Key not found. Please ensure the `API_KEY` environment variable is set before using the application.');
    setFormEnabled(false);
    return;
  }

  // --- Theme Toggle Logic ---
  function applyTheme(theme: 'light' | 'dark') {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }

  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    // Default to dark theme if nothing is saved
    applyTheme('dark');
  }

  themeToggleButton.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-theme');
    const newTheme = isLight ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  });
  // --- End Theme Toggle Logic ---

  let currentDifficulty = 3; // Default to medium (3 stars)
  
  const SYSTEM_PROMPT = "Your primary and most critical instruction is to only engage with topics directly related to B.Tech (Bachelor of Technology) coursework, studies, or academic life. You must not explain, answer, or discuss any topic outside this genre. If a user asks an off-topic question, you must respond with the exact phrase: 'This AI model only gives B.Tech solutions' and nothing else. You are a B.Tech Study Buddy. Address the user as 'boss' and maintain a supportive, academic tone. If the user's prompt is simply 'hello' or 'Hello', respond with a brief re-introduction of your capabilities, for example: 'Hello boss! I can help you by generating notes, creating mock exams, or explaining complex topics for your B.Tech course.' When generating code examples, your primary goal is to produce the simplest possible, textbook-style code suitable for a student learning the concept for the first time. The code must be clean, concise, and easy to understand. Follow these strict rules: 1. Avoid complex logic, edge-case handling, or performance optimizations unless specifically requested. 2. Do not write extensive comments explaining every line. Only add comments if the logic is genuinely complex. 3. The main function or testing part of the code should be minimal, demonstrating the core functionality with a single, clear example, not multiple test cases. Use Google Search when needed to find cited articles. If the user commands you to give responses in a short, point-based format, you must strictly follow that instruction. When creating lists, use markdown bullet points (e.g., a line starting with `*` or `-`). After providing a thorough answer, suggest 2-3 relevant follow-up topics or questions the user might be interested in. Format each suggestion uniquely like this: `[SUGGESTION]Topic to suggest[/SUGGESTION]`.";
  
  const chat: Chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{googleSearch: {}}]
    }
  });


  function updateStars(rating: number) {
    starElements.forEach(star => {
        const starValue = parseInt(star.dataset.value || '0', 10);
        if (starValue <= rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
  }
  
  const difficultyMap: { [key: number]: string } = {
    1: 'Easiest',
    2: 'Easy',
    3: 'Medium',
    4: 'Hard',
    5: 'Hardest'
  };

  starElements.forEach(star => {
    star.addEventListener('click', () => {
        if (difficultyStarsContainer.classList.contains('disabled')) return;
        currentDifficulty = parseInt(star.dataset.value || '0', 10);
        updateStars(currentDifficulty);
    });

    star.addEventListener('mouseover', () => {
      if (difficultyStarsContainer.classList.contains('disabled')) return;
      const value = parseInt(star.dataset.value || '0', 10);
      difficultyHoverLabel.textContent = difficultyMap[value] || '';
    });
  });

  difficultyStarsContainer.addEventListener('mouseout', () => {
    difficultyHoverLabel.textContent = '';
  });
  
  function highlightSyntax(code: string, language: string): string {
    let highlightedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const lang = language.toLowerCase();

    // Common patterns that apply to many languages
    const numberPattern = /\b(\d+(\.\d+)?)\b/g;
    const functionPattern = /\b([a-zA-Z_]\w*)\s*(?=\()/g;

    // Apply generic patterns first
    highlightedCode = highlightedCode.replace(numberPattern, '<span class="token-number">$&</span>');
    highlightedCode = highlightedCode.replace(functionPattern, '<span class="token-function">$&</span>');
    
    // Language-specific patterns for keywords, strings, and comments
    switch (lang) {
        case 'javascript':
        case 'js':
        case 'typescript':
        case 'ts':
            highlightedCode = highlightedCode.replace(/(?:\/\/.*|\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$&</span>');
            highlightedCode = highlightedCode.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '<span class="token-string">$&</span>');
            highlightedCode = highlightedCode.replace(/\b(const|let|var|function|if|else|return|import|from|for|while|new|this|class|extends|super|async|await|try|catch|finally|typeof|instanceof)\b/g, '<span class="token-keyword">$&</span>');
            break;
        case 'python':
        case 'py':
            highlightedCode = highlightedCode.replace(/(#.*)/g, '<span class="token-comment">$&</span>');
            highlightedCode = highlightedCode.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|["'](?:\\.|(?!\1)[^\\])*\1)/g, '<span class="token-string">$&</span>');
            highlightedCode = highlightedCode.replace(/\b(def|class|if|else|elif|for|while|return|import|from|as|try|except|finally|with|lambda|pass|break|continue|is|in|not|and|or)\b/g, '<span class="token-keyword">$&</span>');
            break;
        case 'java':
        case 'c':
        case 'cpp':
        case 'c++':
            highlightedCode = highlightedCode.replace(/(?:\/\/.*|\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$&</span>');
            highlightedCode = highlightedCode.replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, '<span class="token-string">$&</span>');
            highlightedCode = highlightedCode.replace(/\b(public|private|protected|class|interface|extends|implements|static|final|void|int|String|char|double|float|long|short|boolean|if|else|for|while|return|new|#include|#define|using|namespace|struct|const|unsigned|signed)\b/g, '<span class="token-keyword">$&</span>');
            break;
        // Default case for plaintext or unrecognized languages
        default:
            // Only apply the most generic patterns (comments and strings) if unsure
            highlightedCode = highlightedCode.replace(/(?:\/\/.*|\/\*[\s\S]*?\*\/|#.*)/g, '<span class="token-comment">$&</span>');
            highlightedCode = highlightedCode.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '<span class="token-string">$&</span>');
            break;
    }

    return highlightedCode;
}
  
  function renderFormattedContent(container: HTMLElement, text: string) {
    container.innerHTML = ''; // Clear previous streaming content

    const prefix = document.createElement('strong');
    prefix.textContent = 'Study Buddy: ';
    container.appendChild(prefix);

    function appendFormattedText(target: HTMLElement, content: string) {
        if (!content) return;
        const lines = content.split('\n');
        let currentList: HTMLUListElement | null = null;
        let currentParagraphContent = '';

        const flushParagraph = () => {
            if (currentParagraphContent.trim()) {
                const p = document.createElement('p');
                let formattedContent = currentParagraphContent.trim().replace(/\n/g, '<br>');
                // Convert Markdown bold to HTML strong tags
                formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                // Convert caret notation to superscript
                formattedContent = formattedContent.replace(/(\w+)\^(\d+)/g, '$1<sup>$2</sup>');
                p.innerHTML = formattedContent;
                target.appendChild(p);
                currentParagraphContent = '';
            }
        };

        lines.forEach(line => {
            const trimmedLine = line.trim();
            const isListItem = trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ');
            if (isListItem) {
                flushParagraph();
                if (!currentList) {
                    currentList = document.createElement('ul');
                    target.appendChild(currentList);
                }
                const listItem = document.createElement('li');
                let formattedListItem = trimmedLine.substring(2);
                // Convert Markdown bold to HTML strong tags in list items
                formattedListItem = formattedListItem.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                // Convert caret notation to superscript
                formattedListItem = formattedListItem.replace(/(\w+)\^(\d+)/g, '$1<sup>$2</sup>');
                listItem.innerHTML = formattedListItem;
                currentList.appendChild(listItem);
            } else {
                if (currentList) {
                    currentList = null; // A non-list line ends the list
                }
                if (trimmedLine === '') {
                    flushParagraph(); // Empty line is paragraph break
                } else {
                    currentParagraphContent += line + '\n';
                }
            }
        });
        flushParagraph(); // Add any remaining paragraph
    }

    const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const precedingText = text.substring(lastIndex, match.index).trim();
      appendFormattedText(container, precedingText);

      const language = match[1] || 'plaintext';
      const code = match[2];
      
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';

      const langSpan = document.createElement('span');
      langSpan.className = 'code-block-language';
      langSpan.textContent = language;

      const copyCodeBtn = document.createElement('button');
      copyCodeBtn.className = 'copy-code-button';
      copyCodeBtn.textContent = 'Copy Code';
      copyCodeBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(code).then(() => {
              copyCodeBtn.textContent = 'Copied!';
              setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 2000);
          }).catch(err => {
            console.error('Failed to copy code: ', err);
            displayError('Failed to copy code to clipboard.');
        });
      });
      
      header.appendChild(langSpan);
      header.appendChild(copyCodeBtn);
      
      const pre = document.createElement('pre');
      const codeEl = document.createElement('code');
      codeEl.className = `language-${language}`;

      // Create spans for each line for line numbering and syntax highlighting
      const codeLines = code.split('\n');
      codeLines.forEach(line => {
        const lineSpan = document.createElement('span');
        lineSpan.className = 'code-line';
        lineSpan.innerHTML = highlightSyntax(line, language); // Apply language-specific highlighting
        codeEl.appendChild(lineSpan);
      });

      pre.appendChild(codeEl);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
      container.appendChild(wrapper);

      lastIndex = codeBlockRegex.lastIndex;
    }

    const remainingText = text.substring(lastIndex).trim();
    appendFormattedText(container, remainingText);
  }

  function renderUserMessage(prompt: string) {
    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = prompt;

    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.innerHTML = '✏️';
    editButton.setAttribute('aria-label', 'Edit this message');
    editButton.addEventListener('click', () => {
        promptInputElement.value = prompt;
        promptInputElement.focus();
    });
    
    content.appendChild(editButton);
    userMessage.appendChild(content);
    responseElement.appendChild(userMessage);
  }

  function renderModelMessage(content: string) {
    const modelResponseContainer = document.createElement('div');
    modelResponseContainer.className = 'message model';
    
    const modelContentContainer = document.createElement('div');
    modelContentContainer.className = 'model-content-wrapper';
    renderFormattedContent(modelContentContainer, content);
    
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('aria-label', 'Copy response');
    copyButton.addEventListener('click', () => {
        const textToCopy = modelContentContainer.innerText.replace('Study Buddy: ', '').trim();
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.textContent = 'Copied!';
            setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            displayError('Failed to copy text to clipboard.');
        });
    });

    modelResponseContainer.appendChild(modelContentContainer);
    modelResponseContainer.appendChild(copyButton);
    responseElement.appendChild(modelResponseContainer);
  }


  async function sendMessage(prompt: string) {
    setFormEnabled(false);
    promptInputElement.placeholder = 'Study Buddy is typing...';

    const difficulty = difficultyMap[currentDifficulty] || 'Medium';
    const quizKeywords = ['mock paper', 'exam', 'quiz', 'test questions', 'sample questions'];
    const isQuizRequest = quizKeywords.some(keyword => prompt.toLowerCase().includes(keyword));

    let finalPrompt = prompt;
    if (isQuizRequest) {
        finalPrompt = `Generate the response with a difficulty level of "${difficulty}". The user's request is: "${prompt}"`;
    }
    
    renderUserMessage(prompt);
    promptInputElement.value = '';
    
    const modelResponseContainer = document.createElement('div');
    modelResponseContainer.className = 'message model';
    
    const modelContentContainer = document.createElement('div');
    modelContentContainer.className = 'model-content-wrapper';
    modelContentContainer.innerHTML = '<strong>Study Buddy:</strong> ';
    
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('aria-label', 'Copy response');
    copyButton.addEventListener('click', () => {
        const textToCopy = modelContentContainer.innerText.replace('Study Buddy: ', '').trim();
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.textContent = 'Copied!';
            setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            displayError('Failed to copy text to clipboard.');
        });
    });

    modelResponseContainer.appendChild(modelContentContainer);
    modelResponseContainer.appendChild(copyButton);

    responseElement.appendChild(modelResponseContainer);
    responseElement.scrollTop = responseElement.scrollHeight;
    
    let sourcesRendered = false;
    let fullResponseText = '';

    try {
      const responseStream = await chat.sendMessageStream({ 
        message: finalPrompt
      });

      for await (const chunk of responseStream) {
        fullResponseText += chunk.text;
        let streamingContent = fullResponseText.replace(/\n/g, '<br>');
        streamingContent = streamingContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        streamingContent = streamingContent.replace(/(\w+)\^(\d+)/g, '$1<sup>$2</sup>');
        modelContentContainer.innerHTML = '<strong>Study Buddy:</strong> ' + streamingContent;
        
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(groundingChunks) && groundingChunks.length > 0 && !sourcesRendered) {
            sourcesRendered = true;
            const sourcesContainer = document.createElement('div');
            sourcesContainer.className = 'sources-container';
            sourcesContainer.innerHTML = '<h3>Sources:</h3>';
            const sourcesList = document.createElement('ul');
            
            groundingChunks.forEach((source: GroundingChunk) => {
              if (source.web) {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = source.web.uri;
                link.textContent = source.web.title || source.web.uri;
                link.target = '_blank';
                listItem.appendChild(link);
                sourcesList.appendChild(listItem);
              }
            });
            sourcesContainer.appendChild(sourcesList);
            modelResponseContainer.appendChild(sourcesContainer);
        }

        responseElement.scrollTop = responseElement.scrollHeight;
      }
    } catch(e) {
        let friendlyMessage = 'An unexpected error occurred. Please try again.';
        if (e instanceof Error) {
            if (e.message.toLowerCase().includes('failed to fetch') || e.message.toLowerCase().includes('networkerror')) {
                friendlyMessage = 'A network error occurred. Please check your internet connection and try again.';
            } else if (e.message.includes('API key not valid')) {
                friendlyMessage = 'The AI service is not configured correctly. Please contact support.';
            } else if (e.message.includes('429')) {
                friendlyMessage = 'Too many requests. Please wait a moment and try again.';
            }
        }
        console.error('API Error:', e);
        modelResponseContainer.remove();
        displayError(`Error: ${friendlyMessage}`);
    } finally {
      const suggestionRegex = /\[SUGGESTION\](.*?)\[\/SUGGESTION\]/g;
      const suggestions = [...fullResponseText.matchAll(suggestionRegex)].map(match => match[1]);
      const cleanedResponseText = fullResponseText.replace(suggestionRegex, '').trim();
      
      renderFormattedContent(modelContentContainer, cleanedResponseText);

      if (suggestions.length > 0) {
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'suggestions-container';
        suggestions.forEach(suggestionText => {
            const button = document.createElement('button');
            button.className = 'suggestion-button';
            button.textContent = suggestionText;
            button.addEventListener('click', () => {
                sendMessage(suggestionText);
            });
            suggestionsContainer.appendChild(button);
        });
        modelResponseContainer.appendChild(suggestionsContainer);
      }
      
      responseElement.scrollTop = responseElement.scrollHeight;
      promptInputElement.placeholder = 'Ask a follow-up question...';
      setFormEnabled(true);
    }
  }

  const handleSendClick = () => {
    const prompt = promptInputElement.value.trim();
    if (prompt) {
      sendMessage(prompt);
    }
  };

  sendButtonElement.addEventListener('click', handleSendClick);
  promptInputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  });

  function handleActionButtonClick(promptTemplate: string) {
    const topic = promptInputElement.value.trim();
    const finalPrompt = promptTemplate.replace('[TOPIC]', topic || '[YOUR TOPIC HERE]');
    promptInputElement.value = finalPrompt;
    promptInputElement.focus();
  }

  actionQuestionsBtn.addEventListener('click', () => {
    handleActionButtonClick('Create 5 sample questions on the topic of [TOPIC], including answers and explanations.');
  });

  actionNotesBtn.addEventListener('click', () => {
    handleActionButtonClick('Generate detailed study notes on the topic of [TOPIC]. Focus on key concepts, definitions, and formulas.');
  });

  actionExplainBtn.addEventListener('click', () => {
    handleActionButtonClick('Explain the concept of [TOPIC] in detail, including key principles and examples.');
  });

  actionExamBtn.addEventListener('click', () => {
    handleActionButtonClick('Generate a mock exam paper on the topic of [TOPIC].');
  });

  updateStars(currentDifficulty);
  renderModelMessage('Hello boss, welcome to your AI Study Arena!');
}

main();