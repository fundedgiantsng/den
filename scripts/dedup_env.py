import os

paths = ['/var/www/fundedgiants/apps/api/.env', '/var/www/fundedgiants/.env']
for p in paths:
    if not os.path.exists(p):
        continue
    with open(p, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    env_map = {}
    for l in lines:
        t = l.strip()
        if not t or t.startswith('#'):
            continue
        if '=' in t:
            k, v = t.split('=', 1)
            clean_k = k.strip()
            clean_v = v.strip().strip('"\'')
            env_map[clean_k] = clean_v
    with open(p, 'w', encoding='utf-8') as f:
        for k, v in env_map.items():
            f.write(f'{k}="{v}"\n')
    print(f'Deduplicated {p}: {len(env_map)} distinct variables')
