import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gadgethub_admin/core.dart';

void main() {
  test('admin theme uses the dark GadgetHub design system', () {
    final theme = adminTheme(Brightness.dark);
    expect(theme.brightness, Brightness.dark);
    expect(theme.useMaterial3, isTrue);
  });
}
