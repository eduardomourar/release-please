// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {describe, it, afterEach, beforeEach} from 'mocha';
import {expect} from 'chai';
import {GitHub} from '../../src/github';
import {PHP} from '../../src/strategies/php';
import * as sinon from 'sinon';
import {assertHasUpdate, assertNoHasUpdate} from '../helpers';
import {buildMockConventionalCommit} from '../helpers';
import {TagName} from '../../src/util/tag-name';
import {Version} from '../../src/version';
import {Changelog} from '../../src/updaters/changelog';
import {RootComposerUpdatePackages} from '../../src/updaters/php/root-composer-update-packages';
import {DefaultUpdater} from '../../src/updaters/default';

const sandbox = sinon.createSandbox();

const COMMITS = [
  ...buildMockConventionalCommit(
    'fix(deps): update dependency com.google.cloud:google-cloud-storage to v1.120.0'
  ),
  ...buildMockConventionalCommit(
    'fix(deps): update dependency com.google.cloud:google-cloud-spanner to v1.50.0'
  ),
  ...buildMockConventionalCommit('chore: update common templates'),
];

describe('PHP', () => {
  let github: GitHub;
  beforeEach(async () => {
    github = await GitHub.create({
      owner: 'googleapis',
      repo: 'php-test-repo',
      defaultBranch: 'main',
    });
  });
  afterEach(() => {
    sandbox.restore();
  });
  describe('buildReleasePullRequest', () => {
    it('returns release PR changes with defaultInitialVersion', async () => {
      const expectedVersion = '1.0.0';
      const strategy = new PHP({
        targetBranch: 'main',
        github,
        component: 'google-cloud-automl',
      });
      const latestRelease = undefined;
      const release = await strategy.buildReleasePullRequest(
        COMMITS,
        latestRelease
      );
      expect(release!.version?.toString()).to.eql(expectedVersion);
    });
    it('returns release PR changes with semver patch bump', async () => {
      const expectedVersion = '0.123.5';
      const strategy = new PHP({
        targetBranch: 'main',
        github,
        component: 'google-cloud-automl',
      });
      const latestRelease = {
        tag: new TagName(Version.parse('0.123.4'), 'google-cloud-automl'),
        sha: 'abc123',
        notes: 'some notes',
      };
      const release = await strategy.buildReleasePullRequest(
        COMMITS,
        latestRelease
      );
      expect(release!.version?.toString()).to.eql(expectedVersion);
    });
  });
  describe('buildUpdates', () => {
    it('builds common files', async () => {
      const strategy = new PHP({
        targetBranch: 'main',
        github,
        component: 'google-cloud-automl',
      });
      const latestRelease = undefined;
      const release = await strategy.buildReleasePullRequest(
        COMMITS,
        latestRelease
      );
      const updates = release!.updates;
      expect(updates).lengthOf(3);
      assertHasUpdate(updates, 'CHANGELOG.md', Changelog);
      assertHasUpdate(updates, 'composer.json', RootComposerUpdatePackages);
      assertHasUpdate(updates, 'VERSION', DefaultUpdater);
    });

    it('omits changelog if skipChangelog=true', async () => {
      const strategy = new PHP({
        targetBranch: 'main',
        github,
        component: 'google-cloud-automl',
        skipChangelog: true,
      });
      const latestRelease = undefined;
      const release = await strategy.buildReleasePullRequest(
        COMMITS,
        latestRelease
      );
      const updates = release!.updates;
      expect(updates).lengthOf(2);
      assertNoHasUpdate(updates, 'CHANGELOG.md');
      assertHasUpdate(updates, 'composer.json', RootComposerUpdatePackages);
      assertHasUpdate(updates, 'VERSION', DefaultUpdater);
    });
  });
});
