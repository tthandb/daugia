-- name: CreateViewEvent :exec
INSERT INTO view_events (id, article_id, ip_hash, user_agent, referrer)
VALUES ($1, $2, $3, $4, $5);

-- name: CountViewsByArticle :one
SELECT count(*) FROM view_events WHERE article_id = $1;

-- name: RecentViewsByArticle :many
SELECT date_trunc('day', viewed_at)::date as day, count(*) as views
FROM view_events
WHERE article_id = $1 AND viewed_at > now() - interval '30 days'
GROUP BY day
ORDER BY day;
