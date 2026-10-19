from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
files=['manifest.json','popup.html','popup.css','popup.js','app.html','app.css','app.js','core.js','solver-worker.js','README.md','data/players-template.csv','docs/RELEASE_STATUS.md','docs/SOURCE_RECOVERY.md']
files += [str(p.relative_to(root)) for p in sorted((root/'fonts').iterdir()) if p.is_file()]
files += ['native-loader.js','native-bridge.js'] + [str(p.relative_to(root)) for p in sorted((root/'vendor/fodder').iterdir()) if p.is_file()]
output=root/'site/downloads'; output.mkdir(exist_ok=True)
archive=output/'fc-supporter.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for name in files:
        info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
        z.writestr(info,(root/name).read_bytes())
meta={'version':json.loads((root/'manifest.json').read_text())['version_name'],'files':[]}
for name in ['fc-supporter.zip','fc-supporter.user.js']:
    p=output/name;meta['files'].append({'name':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(output/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta,indent=2))
