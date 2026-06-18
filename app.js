/* global Blob, document, window, localStorage, navigator */

const themeButtons = Array.from(document.querySelectorAll('[data-theme-choice]'));
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const storedTheme = localStorage.getItem('nyadb-theme') || 'system';

const demoTitle = document.querySelector('#demo-title');
const demoStatus = document.querySelector('#demo-status');
const demoResult = document.querySelector('#demo-result');
const demoJson = document.querySelector('#demo-json');
const heroJson = document.querySelector('#hero-json');
const heroSize = document.querySelector('#hero-size');
const demoButtons = Array.from(document.querySelectorAll('[data-demo-action]'));
const codeBlocks = Array.from(document.querySelectorAll('pre code'));

let demoName = 'users';
let demoData = {
	ada: {
		role: 'admin',
		active: true,
	},
	linus: {
		role: 'maintainer',
		active: true,
	},
};

function resolveTheme(choice) {
	if (choice === 'system') {
		return systemTheme.matches ? 'dark' : 'light';
	}

	return choice;
}

function setTheme(choice) {
	const resolvedTheme = resolveTheme(choice);
	document.documentElement.dataset.theme = resolvedTheme;
	document.documentElement.dataset.themeMode = choice;
	localStorage.setItem('nyadb-theme', choice);

	themeButtons.forEach((button) => {
		const isActive = button.dataset.themeChoice === choice;
		button.setAttribute('aria-pressed', String(isActive));
	});
}

function escapeHtml(source) {
	return source
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function getLanguage(codeElement) {
	const source = codeElement.textContent.trim();

	if (source.startsWith('{') || source.startsWith('[')) {
		return 'json';
	}

	if (source.startsWith('npm ') || source.startsWith('node ')) {
		return 'shell';
	}

	return 'js';
}

function getTokenClass(token, language, source, tokenEnd) {
	if (/^\/\/|^\/\*/.test(token) || token.startsWith('#')) {
		return 'comment';
	}

	if (/^["'`]/.test(token)) {
		if ((language === 'json' || language === 'js') && /^\s*:/.test(source.slice(tokenEnd))) {
			return 'property';
		}

		return 'string';
	}

	if (/^\d/.test(token)) {
		return 'number';
	}

	if (/^[{}[\]().,;:]$/.test(token)) {
		return 'punctuation';
	}

	if (/^[+\-*/%=!<>|&?]+$/.test(token)) {
		return 'operator';
	}

	if (language === 'shell' && /^(npm|node|npx)$/.test(token)) {
		return 'command';
	}

	if (/^(const|let|var|new|return|if|else|true|false|null|undefined|require|install|run|test)$/.test(token)) {
		return 'keyword';
	}

	if (/^[a-zA-Z_$][\w$]*$/.test(token)) {
		if (language !== 'shell' && /^\s*:/.test(source.slice(tokenEnd))) {
			return 'property';
		}

		if (/^\s*\(/.test(source.slice(tokenEnd))) {
			return 'function';
		}
	}

	return '';
}

function highlightSource(source, language) {
	const matcher = language === 'shell'
		? /(#.*|\b(?:npm|node|npx|install|run|test)\b|[@\w./-]+|[^\s])/g
		: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\/|\b(?:const|let|var|new|return|if|else|true|false|null|undefined|require)\b|\b\d+(?:\.\d+)?\b|[a-zA-Z_$][\w$]*|[{}[\]().,;:]|[+\-*/%=!<>|&?]+)/g;
	let cursor = 0;
	let output = '';
	let match = matcher.exec(source);

	while (match) {
		const token = match[0];
		const tokenStart = match.index;
		const tokenEnd = tokenStart + token.length;
		const tokenClass = getTokenClass(token, language, source, tokenEnd);

		output += escapeHtml(source.slice(cursor, tokenStart));
		output += tokenClass
			? `<span class="tok-${tokenClass}">${escapeHtml(token)}</span>`
			: escapeHtml(token);
		cursor = tokenEnd;
		match = matcher.exec(source);
	}

	return output + escapeHtml(source.slice(cursor));
}

function highlightCode(codeElement, language) {
	const source = codeElement.textContent;
	codeElement.innerHTML = highlightSource(source, language || getLanguage(codeElement));
}

function getFormattedJson(data) {
	return JSON.stringify(data, null, '\t');
}

function getSizeLabel(data) {
	const bytes = new Blob([getFormattedJson(data)]).size;

	if (bytes < 1024) {
		return `${bytes} B`;
	}

	return `${(bytes / 1024).toFixed(2)} KB`;
}

function setActiveButton(action) {
	demoButtons.forEach((button) => {
		button.classList.toggle('active', button.dataset.demoAction === action);
	});
}

function getDemoMessage(status, action) {
	if (action === 'size') {
		return `size('${demoName}') returned ${status}.`;
	}

	if (action === 'create') {
		return `create('${demoName}') created an empty JSON database.`;
	}

	if (action === 'set' || action === 'add') {
		return `set('${demoName}', data) saved the JSON shown below.`;
	}

	if (action === 'clear') {
		return `clear('${demoName}') kept the file and reset its contents to {}.`;
	}

	if (action === 'rename') {
		return `rename() changed the active file to ${demoName}.json.`;
	}

	return 'Ready to run a method.';
}

function renderDemo(status, action) {
	const json = getFormattedJson(demoData);
	demoTitle.textContent = `NyaDB/${demoName}.json`;
	demoStatus.textContent = status;
	demoResult.textContent = getDemoMessage(status, action);
	demoJson.innerHTML = highlightSource(json, 'json');
	heroJson.innerHTML = highlightSource(json, 'json');
	heroSize.textContent = getSizeLabel(demoData);
	setActiveButton(action);
}

function runDemoAction(action) {
	if (action === 'create') {
		demoName = 'users';
		demoData = {};
		renderDemo('created', action);
		return;
	}

	if (action === 'set') {
		demoName = 'users';
		demoData = {
			ada: {
				role: 'admin',
				active: true,
			},
			linus: {
				role: 'maintainer',
				active: true,
			},
		};
		renderDemo('saved', action);
		return;
	}

	if (action === 'add') {
		demoData = {
			...demoData,
			grace: {
				role: 'operator',
				active: false,
			},
		};
		renderDemo('merged', action);
		return;
	}

	if (action === 'size') {
		renderDemo(getSizeLabel(demoData), action);
		return;
	}

	if (action === 'clear') {
		demoData = {};
		renderDemo('cleared', action);
		return;
	}

	if (action === 'rename') {
		demoName = demoName === 'users' ? 'members' : 'users';
		renderDemo('renamed', action);
		return;
	}

	demoName = 'users';
	demoData = {
		ada: {
			role: 'admin',
			active: true,
		},
		linus: {
			role: 'maintainer',
			active: true,
		},
	};
	renderDemo('ready', action);
}

function copyText(text, button) {
	navigator.clipboard.writeText(text).then(() => {
		const original = button.textContent;
		button.textContent = 'Copied';

		window.setTimeout(() => {
			button.textContent = original;
		}, 1200);
	}).catch(() => {
		button.textContent = 'Select';
	});
}

themeButtons.forEach((button) => {
	button.addEventListener('click', () => {
		setTheme(button.dataset.themeChoice);
	});
});

systemTheme.addEventListener('change', () => {
	const themeMode = document.documentElement.dataset.themeMode || 'system';

	if (themeMode === 'system') {
		setTheme('system');
	}
});

document.querySelectorAll('[data-copy], [data-copy-target]').forEach((button) => {
	button.addEventListener('click', () => {
		const directCopy = button.dataset.copy;
		const targetId = button.dataset.copyTarget;
		const targetCopy = targetId ? document.querySelector(`#${targetId}`).textContent : '';
		copyText(directCopy || targetCopy, button);
	});
});

demoButtons.forEach((button) => {
	button.addEventListener('click', () => {
		runDemoAction(button.dataset.demoAction);
	});
});

setTheme(storedTheme);
codeBlocks.forEach((codeBlock) => {
	if (codeBlock !== demoJson && codeBlock !== heroJson) {
		highlightCode(codeBlock);
	}
});
renderDemo('ready', 'reset');
