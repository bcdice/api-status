// ステータスを出力する HTML 要素
const stat = document.getElementById('status');

// 動的にサーバリストをダウンロードできなかった場合に使うリスト
const staticServerList = [
	'https://bcdice.kazagakure.net',
	'https://bcdice.herokuapp.com',
	'https://www.taruki.com/bcdice-api',
	'https://bcdice-api.conos.jp',
	'https://bcdice.onlinesession.app',
	'https://bcdice.trpg.net',
];

var latestVersions = {
	'api': '',
	'bcdice': ''
}

// ページが読み込まれたときに実行する
window.onload = function () {
	// JS 非対応コメントを削除
	stat.textContent = '';

	getLatestRelease()
		.then(function () {
			return getServerList();
		})
		.catch(function (error) {
			console.error(error);
		});
};

/**
 * サーバリストをダウンロード
 * @returns {Promise<void>}
 */
async function getServerList() {
	stat.textContent = 'サーバリストをダウンロード中';

	try {
		const controller = new AbortController();
		const signal = controller.signal;
		setTimeout(() => controller.abort(), 1000);
		const response = await fetch(
			'https://raw.githubusercontent.com/bcdice/bcdice-api-servers/master/servers.yaml',
			{ signal }
		);
		if (!response.ok) {
			throw new Error("status code: " + response.status);
		}
		const text = await response.text();
		return getStatuses(jsyaml.load(text));
	} catch (error) {
		console.error(error);
		stat.textContent = 'サーバリストのダウンロードに失敗、固定のリストをもとに稼働中のバージョンを取得中';
		const header = document.getElementById('header');
		header.textContent = '';
		return getStatuses(staticServerList);
	}
}

/**
 * @param {string[]} serverList
 * @returns {Promise<void>}
 */
async function getStatuses(serverList) {
	// 各サーバの API を叩いてデータを取得・表示
	outputList(serverList);
	await getVersions();
	stat.textContent = '完了';
}

function getA(href, type = null, content = null) {
	var a = document.createElement('a');
	a.innerHTML = content ? content : href;
	switch(type) {
		case 'api':
			href = extractVersionNumber(href);
			a.href = 'https://github.com/bcdice/bcdice-api/releases/tag/' + href;
			if(latestVersions['api'] == href) {
				a.classList.add('latest-version');
			}
			break;
		case 'bcdice':
			href = extractVersionNumber(href);
			a.href = 'https://github.com/bcdice/BCDice/releases/tag/v' + href;
			if(latestVersions['bcdice'] == href) {
				a.classList.add('latest-version');
			}
			break;
		case 'clipboard':
			a.href = 'javascript:onclick=toClipBoard("' + href + '");';
			break;
		case 'admin-url':
			a.href = (href.match(/^http/) ? '' : 'http://') + href;
			break;
		case 'admin-email':
			a.href = 'mailto:' + href;
			break;
		default:
			a.href = href;
			break;
	}
	return a;
}

function toClipBoard(text) {
	var input = document.createElement('textarea');
	input.textContent = text;
	var body = document.getElementsByTagName('body')[0];
	body.appendChild(input);
	input.select();
	document.execCommand('copy');
	body.removeChild(input);
	alert("Copied!");
}

function outputList(servers) {
	for (const server of servers) {
		var tdServerName = document.createElement('td');
		tdServerName.classList.add('server-name');
		tdServerName.textContent = server;
		var tdApiVersion = document.createElement('td');
		tdApiVersion.classList.add('api-version');
		var tdLibVersion = document.createElement('td');
		tdLibVersion.classList.add('lib-version');
		var tdResponseTime = document.createElement('td');
		tdResponseTime.classList.add('response-time');
		var tdAdminName = document.createElement('td');
		tdAdminName.classList.add('admin-name');
		var tdAdminURL = document.createElement('td');
		tdAdminURL.classList.add('admin-url');
		var tdAdminEmail = document.createElement('td');
		tdAdminEmail.classList.add('admin-email');

		var tr = document.createElement('tr');
		tr.appendChild(tdServerName);
		tr.appendChild(tdApiVersion);
		tr.appendChild(tdLibVersion);
		tr.appendChild(tdResponseTime);
		tr.appendChild(tdAdminName);
		tr.appendChild(tdAdminURL);
		tr.appendChild(tdAdminEmail);

		var table = document.getElementById('versions');
		table.appendChild(tr);
	}
}

/**
 * @returns {Promise<void[]>}
 */
function getVersions() {
	var table = document.getElementById('versions');
	const promises = Array.from(table.getElementsByTagName('tr')).map(async function (server) {
		var name = server.querySelector('.server-name');
		var api = server.querySelector('.api-version');
		var lib = server.querySelector('.lib-version');
		var time = server.querySelector('.response-time');
		var admin_name = server.querySelector('.admin-name');
		var admin_url = server.querySelector('.admin-url');
		var admin_email = server.querySelector('.admin-email');
		var base_url = name.innerHTML;

		const startTime = performance.now();

		try {
			const controller = new AbortController();
			const signal = controller.signal;
			setTimeout(() => controller.abort(), 5000);
			const response = await fetch(base_url + '/v1/version', {
				signal,
			});
			if (!response.ok) {
				throw new Error("status code: " + response.status);
			}
			const data = await response.json();
			name.innerHTML = '';
			name.appendChild(getA(base_url, 'clipboard'));
			api.appendChild(getA(data['api'], 'api'));
			lib.appendChild(getA(data['bcdice'], 'bcdice'));
			getAdminInformations(
				base_url,
				{
					name: admin_name,
					url: admin_url,
					email: admin_email
				}
			);

			const endTime = performance.now();
			time.innerHTML = Math.round(endTime - startTime) + 'ms';
		} catch (error) {
			console.error(error);
			if (error.name === 'AbortError') {
				api.innerHTML = 'Timeout';
				lib.innerHTML = 'Timeout';
			} else {
				api.innerHTML = 'Error';
				lib.innerHTML = 'Error';
			}
		}
	});
	return Promise.all(promises);
}

// バージョン番号の頭に v がついているかどうかに関わらず、
// x.y.z 形式のバージョン番号を返す
// param [String] original 調べるバージョン番号
// return [String]
function extractVersionNumber(original) {
	var matching = original.match(/^v?(\d+)\.(\d+)\.(\d+)/);
	return matching[1] + '.' + matching[2] + '.' + matching[3];
};

/**
 * 管理者情報を取得する
 * @param {string} base_url
 * @param admin_elements
 * @returns {Promise<void>}
 */
async function getAdminInformations(base_url, admin_elements) {
	try {
		const controller = new AbortController();
		const signal = controller.signal;
		setTimeout(() => controller.abort(), 10000);
		const response = await fetch(base_url + '/v1/admin', { signal });
		if (!response.ok) {
			throw new Error("status code: " + response.status);
		}
		const data = await response.json();
		if (data['name']) {
			var name = document.createElement('span');
			name.textContent = data['name'];
			admin_elements.name.appendChild(name);
		}

		if (data['url']) {
			var icon = createFontAwesomeIcon('fa-file');
			var a = getA(data['url'], 'admin-url', icon.outerHTML);
			a.target = '_blank';
			admin_elements.url.appendChild(a);
		}

		if (data['email']) {
			var mail = createFontAwesomeIcon('fa-envelope');
			admin_elements.email.appendChild(getA(data['email'], 'admin-email', mail.outerHTML));
		}
	} catch (error) {
		console.error(error);
		if (error.name === 'AbortError') {
			admin_elements.name.textContent = 'Timeout';
		} else {
			admin_elements.name.textContent = 'Error';
		}
	}
}

/**
 * 最新バージョンを取得する
 * @returns {Promise<void[]>}
 */
function getLatestRelease() {
	stat.textContent = 'GitHub より最新リリース情報をダウンロード中';

	// GitHub より、最新リリースを取得する
	var latest_table = document.getElementById('latest-release');
	const promises = Array.from(latest_table.getElementsByClassName('target')).map(async function (target_element) {
		var url = '';
		var type = '';

		switch (target_element.classList[0]) {
			case 'api-version':
				url = 'bcdice/bcdice-api';
				type = 'api';
				break;
			case 'lib-version':
				url = 'bcdice/BCDice';
				type = 'bcdice';
				break;
			default:
				return;
		}
		url = 'https://api.github.com/repos/' + url + '/releases/latest';

		try {
			const controller = new AbortController();
			const signal = controller.signal;
			setTimeout(() => controller.abort(), 5000);
			const response = await fetch(url, { signal });
			if (!response.ok) {
				throw new Error("status code: " + response.status);
			}
			const data = await response.json();
			latestVersions[type] = extractVersionNumber(data['tag_name']);
			target_element.appendChild(getA(data['tag_name'], type, latestVersions[type]));
			target_element.classList.add('latest-version');
		} catch (error) {
			console.error(error);
			if (error.name === 'AbortError') {
				latestVersions[type] = 'Timeout';
				target_element.textContent = 'Timeout';
			} else {
				latestVersions[type] = 'Error';
				target_element.textContent = 'Error';
			}
		}
	});
	return Promise.all(promises);
}

function createFontAwesomeIcon(style, prefix = 'far ') {
	var icon = document.createElement('i');
	icon.className = prefix + style;
	return icon;
};
