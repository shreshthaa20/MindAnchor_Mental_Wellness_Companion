import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models/mood_entry.dart';
import 'api_provider.dart';

class MoodNotifier extends StateNotifier<AsyncValue<List<MoodEntry>>> {
  MoodNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadMoods();
  }

  final Ref _ref;

  Future<void> loadMoods() async {
    state = const AsyncValue.loading();
    try {
      final moods = await _ref.read(moodRepositoryProvider).getMoods();
      if (!mounted) return;
      state = AsyncValue.data(moods);
    } catch (error, stackTrace) {
      if (!mounted) return;
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> addMood(String mood) async {
    final previous = state.value ?? [];
    try {
      final createdMood =
          await _ref.read(moodRepositoryProvider).createMood(mood);
      state = AsyncValue.data([createdMood, ...previous]);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      state = AsyncValue.data(previous);
      rethrow;
    }
  }

  Future<void> updateMood({
    required int id,
    required String mood,
  }) async {
    final previous = state.value ?? [];
    try {
      final updatedMood = await _ref
          .read(moodRepositoryProvider)
          .updateMood(id: id, mood: mood);
      state = AsyncValue.data(
        previous
            .map((item) => item.id == id ? updatedMood : item)
            .toList(),
      );
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      state = AsyncValue.data(previous);
      rethrow;
    }
  }

  Future<void> deleteMood(int id) async {
    final previous = state.value ?? [];
    try {
      await _ref.read(moodRepositoryProvider).deleteMood(id);
      state = AsyncValue.data(
        previous.where((item) => item.id != id).toList(),
      );
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      state = AsyncValue.data(previous);
      rethrow;
    }
  }
}

final moodProvider =
    StateNotifierProvider<MoodNotifier, AsyncValue<List<MoodEntry>>>(
  (ref) => MoodNotifier(ref),
);
