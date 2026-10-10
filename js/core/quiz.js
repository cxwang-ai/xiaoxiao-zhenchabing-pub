(function (root) {
  'use strict';
  var XZ = root.XZ = root.XZ || {};
  // 无 DOM、URL 或存档访问。预览必须由调用方明确传入，默认始终只取 verified。
  function sample(items, count, rng, key) {
    var seen = [], pool = items.filter(function (item) {
      var identity = key(item);
      if (seen.indexOf(identity) !== -1) { return false; }
      seen.push(identity); return true;
    });
    rng = rng || Math.random;
    count = Math.min(pool.length, Math.max(0, Math.floor(count) || 0));
    for (var i = 0; i < count; i += 1) {
      var j = i + Math.floor(rng() * (pool.length - i));
      var temp = pool[i]; pool[i] = pool[j]; pool[j] = temp;
    }
    return pool.slice(0, count);
  }
  function pickQuestions(levelId, count, rng, options) {
    return sample(((XZ.data && XZ.data.quiz) || []).filter(function (q) {
      return q.level === levelId && (q.status === 'verified' || (options && options.preview === true && q.status === 'pending'));
    }), count, rng, function (q) { return q.id; });
  }
  function placeChests(candidates, count, rng) {
    return sample(candidates, count, rng, function (point) { return point.x + ':' + point.y; });
  }
  // 小游戏保存 budget.used；满体力时未实际恢复的部分不消耗额度。
  function grantReward(budget, requested, room) {
    // 奖励先取整再入账；向下取整保证不越过资源空间和累计上限。
    var amount = Math.floor(Math.max(0, Math.min(Math.round(requested), room, budget.limit - budget.used)));
    budget.used += amount; return amount;
  }
  XZ.quiz = { pickQuestions: pickQuestions, placeChests: placeChests, grantReward: grantReward };
}(typeof window !== 'undefined' ? window : globalThis));
