from app.api.deps import get_user_permissions


def test_permission_helper_accepts_user_with_no_roles():
    class User:
        roles = []

    class DB:
        def execute(self, _query):
            return []

    assert get_user_permissions(DB(), User()) == set()
