const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('INTERNSHIP_ROLES cover all 8 Flowgrid tracks with complete detail fields and valid Google Form URLs', async () => {
  const {
    CAREERS_FORM_CONFIG,
    INTERNSHIP_ROLES,
    buildApplicationUrl,
    buildRoleDetailModel,
    getRoleById,
    getRoleBySlug,
  } = await import('./careers.js');

  assert.equal(INTERNSHIP_ROLES.length, 8);
  const expectedRoles = new Set([
    'Web Development',
    'Frontend Development',
    'Backend Development',
    'Full Stack Development',
    'UI/UX Design',
    'Artificial Intelligence / Machine Learning',
    'Digital Marketing',
    'Content Creation',
  ]);

  const seenIds = new Set();
  const seenSlugs = new Set();

  for (const role of INTERNSHIP_ROLES) {
    assert.ok(!seenIds.has(role.id), `Duplicate tile id: ${role.id}`);
    assert.ok(!seenSlugs.has(role.slug), `Duplicate slug: ${role.slug}`);
    seenIds.add(role.id);
    seenSlugs.add(role.slug);

    assert.equal(getRoleById(role.id).slug, role.slug);
    assert.equal(getRoleBySlug(role.slug).id, role.id);
    assert.ok(expectedRoles.has(role.formRoleValue), `Unexpected formRoleValue: ${role.formRoleValue}`);

    assert.ok(Array.isArray(role.heroLines) && role.heroLines.length >= 2);
    assert.ok(typeof role.visualType === 'string' && role.visualType.length > 0);
    assert.ok(typeof role.overview === 'string' && role.overview.length > 20);
    assert.ok(Array.isArray(role.workOn) && role.workOn.length === 3);
    assert.ok(Array.isArray(role.responsibilities) && role.responsibilities.length === 3);
    for (const item of role.responsibilities) {
      assert.ok(item.index && item.verb && item.title && item.detail);
    }
    assert.ok(Array.isArray(role.skills) && role.skills.length >= 3);
    assert.ok(Array.isArray(role.skillsDevelop) && role.skillsDevelop.length >= 3);
    assert.ok(typeof role.whoShouldApply === 'string' && role.whoShouldApply.length > 20);

    const imagePath = path.resolve(__dirname, '..', role.image);
    assert.ok(fs.existsSync(imagePath), `Missing role thumbnail: ${role.image}`);

    const url = new URL(
      buildApplicationUrl({
        roleValue: role.formRoleValue,
        duration: CAREERS_FORM_CONFIG.durations[0],
        workMode: CAREERS_FORM_CONFIG.workModes[1],
      })
    );
    assert.equal(url.origin + url.pathname, CAREERS_FORM_CONFIG.baseUrl);
    assert.equal(url.searchParams.get('usp'), 'pp_url');
    assert.equal(url.searchParams.get(CAREERS_FORM_CONFIG.entries.role), role.formRoleValue);
    assert.equal(url.searchParams.get(CAREERS_FORM_CONFIG.entries.duration), '1 month');
    assert.equal(url.searchParams.get(CAREERS_FORM_CONFIG.entries.workMode), 'Hybrid');

    const model = buildRoleDetailModel(role, { duration: '2 months', workMode: 'Hybrid' });
    assert.ok(model.kicker.includes(role.indexNumber));
    assert.ok(model.kicker.includes('2 MONTHS'));
    assert.ok(model.kicker.includes('HYBRID'));
    assert.equal(model.durationLabel, '2 Months');
    assert.equal(model.workModeLabel, 'Hybrid');
    assert.ok(model.prevRole && model.nextRole);
    const modelUrl = new URL(model.applicationUrl);
    assert.equal(modelUrl.searchParams.get(CAREERS_FORM_CONFIG.entries.duration), '2 months');
    assert.equal(modelUrl.searchParams.get(CAREERS_FORM_CONFIG.entries.workMode), 'Hybrid');
  }
});
