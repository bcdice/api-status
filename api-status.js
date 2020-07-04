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

// ページが読み込まれたときに実行する
window.onload = function () {
	// JS 非対応コメントを削除
	stat.textContent = 'GitHub より最新リリース情報をダウンロード中';

	// JS 動的変更用 CSS タグを作成
	var newCss = document.createElement('style');
	newCss.type = "text/css";
	document.getElementsByTagName('head').item(0).appendChild(newCss);

	// GitHub より、最新リリースを取得する
	var latest_table = document.getElementById('latest-release');
	Array.prototype.forEach.call(latest_table.getElementsByClassName('target'), function(target) {
		getLatestRelease(target);
	});

	// サーバリストをダウンロード
	stat.textContent = 'サーバリストをダウンロード中';
	var request = new XMLHttpRequest();
	request.open('GET', 'https://raw.githubusercontent.com/bcdice/bcdice-api-servers/master/servers.yaml');
	request.responseType = 'text';
	request.timeout = 1000;

	request.onload = function () {
		if(this.status != 200) {
			this.onerror();
			return;
		}
		stat.textContent = 'サーバリストをもとに稼働中のバージョンを取得中';
		mainProcess(jsyaml.load(this.response));
	};
	request.onerror = function () {
		stat.textContent = 'サーバリストのダウンロードに失敗、固定のリストをもとに稼働中のバージョンを取得中';
		header = document.getElementById('header');
		header.textContent = '';
		mainProcess(staticServerList);
	}
	request.ontimeout = request.onerror;

	request.send();
}

function mainProcess(serverList) {
	// 各サーバの API を叩いてデータを取得・表示
	outputList(serverList);
	getVersions();
	stat.textContent = '完了';
}

function getA (href, type = null, content = null) {
	var a = document.createElement('a');
	a.innerHTML = content ? content : href;
	switch(type) {
		case 'api':
			href = extractVersionNumber(href);
			a.href = 'https://github.com/ysakasin/bcdice-api/releases/tag/' + href;
			a.classList.add('api-' + href.replace(/\./g, '-'));
			break;
		case 'bcdice':
			href = extractVersionNumber(href);
			href = href.match(/^v/) ? href : 'v' + href
			a.href = 'https://github.com/bcdice/BCDice/releases/tag/' + href;
			a.classList.add('bcdice-' + href.replace(/\./g, '-'));
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

function getVersions() {
	var table = document.getElementById('versions');
	Array.prototype.forEach.call(table.getElementsByTagName('tr'), function(server) {
		var name = server.querySelector('.server-name');
		var api = server.querySelector('.api-version');
		var lib = server.querySelector('.lib-version');
		var time = server.querySelector('.response-time');
		var admin_name = server.querySelector('.admin-name');
		var admin_url = server.querySelector('.admin-url');
		var admin_email = server.querySelector('.admin-email');
		var base_url = name.innerHTML;

		var request = new XMLHttpRequest();
		request.open('GET', base_url + '/v1/version');
		request.responseType = 'json';
		request.timeout = 5000;

		request.onload = function () {
			if(this.status != 200) {
				this.onerror();
				return;
			}

			var data = this.response;
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
			time.innerHTML = (endTime - startTime) + 'ms';
		};
		request.onerror = function () {
			api.innerHTML = 'Error';
			lib.innerHTML = 'Error';
		};
		request.ontimeout = function () {
			api.innerHTML = 'Timeout';
			lib.innerHTML = 'Timeout';
		}

		const startTime = performance.now();
		request.send();
	});
};

function extractVersionNumber(original) {
	var matching = original.match(/^v?(\d+)\.(\d+)\.(\d+)/);
	return matching[1] + '.' + matching[2] + '.' + matching[3];
};

function getAdminInformations(base_url, admin_elements) {
	var request = new XMLHttpRequest();
	request.open('GET', base_url + '/v1/admin');
	request.responseType = 'json';
	request.timeout = 10000;

	request.onload = function() {
		if(this.status != 200) {
			this.onerror();
			return;
		}

		var data = this.response;

		if(data['name'] != null) {
			var name = document.createElement('span');
			name.textContent = data['name'];
			admin_elements.name.appendChild(name);
		}

		if(data['url'] != null){
			var icon = createFontAwesomeIcon('fa-file');
			var a = getA(data['url'], 'admin-url', icon.outerHTML);
			a.target = '_blank';
			admin_elements.url.appendChild(a);
		}

		if(data['email'] != null) {
			var mail = createFontAwesomeIcon('fa-envelope');
			admin_elements.email.appendChild(getA(data['email'], 'admin-email', mail.outerHTML));
		}
	};
	request.onerror = function() {
		admin_elements.name.textContent = 'Error';
	};
	request.ontimeout = function() {
		admin_elements.name.textContent = 'Timeout';
	};
	request.send();
};

function getLatestRelease(target_element) {
	var url = '';
	var type = '';
	switch(target_element.classList[0]) {
		case 'api-version':
			url = 'ysakasin/bcdice-api';
			type = 'api';
			break;
		case 'lib-version':
			url = 'bcdice/BCDice';
			type = 'bcdice';
			break;
		default:
			return;
			break;
	}
	url = 'https://api.github.com/repos/' + url + '/releases/latest';

	var request = new XMLHttpRequest();
	request.open('GET', url)
	request.responseType = 'json';
	request.timeout = 5000;

	request.onload = function() {
		if(this.status != 200) {
			this.onerror();
			return;
		}

		var data = this.response;
		target_element.appendChild(getA(data['tag_name'], type, extractVersionNumber(data['tag_name'])));

		var css = document.styleSheets.item(1);
		css.insertRule('.' + type + '-' + data['tag_name'].replace(/\./g, '-') + ' { font-weight: bold; }', document.styleSheets[1].cssRules.length);
	}
	request.onerror = function() {
		target_element.textContent = 'Error';
	};
	request.ontimeout = function() {
		target_element.textContent = 'Timeout';
	};

	request.send();
};

function createFontAwesomeIcon(style, prefix = 'far ') {
	var icon = document.createElement('i');
	icon.className = prefix + style;
	return icon;
};
