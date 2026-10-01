#!/usr/bin/env python3
"""Dokploy helper for the psquared 'websites' app.

Credentials come from the macOS keychain (never printed):
    security add-generic-password -s psquared-dokploy -a base_url -w https://dokploy.psquared.dev
    security add-generic-password -s psquared-dokploy -a api_key  -w <key>

Run with /usr/bin/python3 (the Homebrew python has a broken cert store on this host).

  dokploy.py show                       app status, env variable NAMES, domains, allowed domains
  dokploy.py allow <host> [<host> ...]  add hosts to NUXT_ALLOWED_DOMAINS (form origin check)
  dokploy.py disallow <host> [...]      remove hosts from NUXT_ALLOWED_DOMAINS
  dokploy.py add-domain <host> [...]    add HTTPS (Let's Encrypt) domains to the app
  dokploy.py deploy                     trigger a redeploy (normally a push to main is enough)
"""
import json, subprocess, sys, urllib.request, urllib.error

APP_ID = 'fInxdkcaASR9aRqzGWuWD'   # project "psquared websites", app "websites"
ENV_KEY = 'NUXT_ALLOWED_DOMAINS'


def kc(account):
    return subprocess.check_output(
        ['security', 'find-generic-password', '-s', 'psquared-dokploy', '-a', account, '-w']).decode().strip()


BASE, KEY = kc('base_url').rstrip('/'), kc('api_key')


def api(path, body=None):
    req = urllib.request.Request(
        BASE + '/api/' + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'x-api-key': KEY, 'Content-Type': 'application/json', 'accept': 'application/json'},
        method='POST' if body is not None else 'GET')
    try:
        raw = urllib.request.urlopen(req).read()
    except urllib.error.HTTPError as e:
        sys.exit(f'Dokploy {path} -> HTTP {e.code}: {e.read()[:300]!r}')
    return json.loads(raw) if raw else None


def app():
    return api('application.one?applicationId=' + APP_ID)


def allowed(env):
    for line in env.splitlines():
        if line.startswith(ENV_KEY + '='):
            return [d.strip() for d in line.split('=', 1)[1].split(',') if d.strip()]
    return []


def save_allowed(a, hosts):
    old = a['env'] or ''
    lines = old.splitlines()
    new_line = ENV_KEY + '=' + ','.join(hosts)
    if any(l.startswith(ENV_KEY + '=') for l in lines):
        new_lines = [new_line if l.startswith(ENV_KEY + '=') else l for l in lines]
    else:
        new_lines = lines + [new_line]
    body = {'applicationId': APP_ID, 'env': '\n'.join(new_lines) + ('\n' if old.endswith('\n') else ''),
            'buildArgs': a.get('buildArgs') or ''}
    for k in ('buildSecrets', 'createEnvFile'):
        if k in a:
            body[k] = a[k]
    api('application.saveEnvironment', body)
    after = app()
    others_before = [l for l in lines if not l.startswith(ENV_KEY + '=')]
    others_after = [l for l in after['env'].splitlines() if not l.startswith(ENV_KEY + '=')]
    assert others_before == others_after, 'other env variables changed — check Dokploy now'
    print(ENV_KEY, '=', ','.join(allowed(after['env'])))
    print('Active after the next deploy (push to main, or: dokploy.py deploy).')


def main():
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else 'show'), sys.argv[2:]
    a = app()
    if cmd == 'show':
        print('app:', a['name'], '| status:', a.get('applicationStatus'), '| branch:', a.get('branch'),
              '| autoDeploy:', a.get('autoDeploy'))
        print('env names:', [l.split('=', 1)[0] for l in (a['env'] or '').splitlines() if '=' in l])
        print(ENV_KEY + ':', allowed(a['env'] or ''))
        print('domains:', [d['host'] for d in a['domains']])
    elif cmd in ('allow', 'disallow'):
        cur = allowed(a['env'] or '')
        new = cur + [h for h in args if h not in cur] if cmd == 'allow' else [h for h in cur if h not in args]
        if new == cur:
            print('no change:', cur)
        else:
            save_allowed(a, new)
    elif cmd == 'add-domain':
        have = {d['host'] for d in a['domains']}
        for host in args:
            if host in have:
                print('exists:', host)
                continue
            api('domain.create', {'host': host, 'path': '/', 'internalPath': '/', 'stripPath': False, 'port': 80,
                                  'https': True, 'certificateType': 'letsencrypt', 'domainType': 'application',
                                  'applicationId': APP_ID})
            print('created:', host)
    elif cmd == 'deploy':
        api('application.deploy', {'applicationId': APP_ID})
        print('deploy triggered')
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
