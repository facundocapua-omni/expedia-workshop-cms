.PHONY: xlsx check clean

XLSX = exports/EG-UC2-content-model-matrix.xlsx
MODEL = model/uc2-matrix.json

xlsx: $(XLSX)

$(XLSX): $(MODEL) scripts/build_xlsx.py
	python3 scripts/build_xlsx.py $(MODEL) -o $(XLSX)

check:
	@python3 -c "import json,sys; d=json.load(open('$(MODEL)')); \
	print('components:', len(d['components'])); \
	print('properties:', sum(len(c['properties']) for c in d['components'])); \
	print('decisions :', len(d['consolidation'])); \
	print('questions :', len(d['open_questions'])); \
	ids=[c['id'] for c in d['components']]; \
	assert len(ids)==len(set(ids)), 'duplicate content type id'; \
	print('ids unique: ok')"

clean:
	rm -f $(XLSX)
